const express = require('express');
const app = express();
const cors = require('cors');
var jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const port = process.env.PORT || 5000;


// middleware
app.use(express.json());
app.use(cors());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.njogpdx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const menuCollection = client.db('bistroBoss').collection('menuData');
    const reviewCollection = client.db('bistroBoss').collection('reviews');
    const cartCollection = client.db('bistroBoss').collection('carts');
    const userCollection = client.db('bistroBoss').collection('users');

    // JWT
    app.post('/jwt', (req, res)=>{
      const user = req.body;
      console.log(4,user)
      const token = jwt.sign(user.email, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '7d'});
      res.send({token});
    })

    // middlewares
    const verifyToken = (req, res, next) =>{
      console.log('from verify token', req.headers.authorization )
      if(!req.headers.authorization){
        return res.status(401).send({message: 'unauthorized access'})
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
        if(err){
          return res.status(401).send({message: 'unauthorized access'})
        }
        req.decoded = decoded;
        console.log(1,decoded)
        next()
      } )
    }
      // use verify admin after verifyToken
      const verifyAdmin = async(req, res, next) =>{
        const email = req.decoded.email;
        const query = {email: email}
        const user = await userCollection.findOne(query)
        const isAdmin = user?.role === 'admin';
        if(!isAdmin){
          return res.status(403).send({message: 'forbidden access'})
        }
        next()
      }

      //  user related api
    app.post('/users', verifyToken,  async(req, res)=>{
      const user = req.body;
      
      // check before inserting if the user exists or not
      const query = {email: user.email}
      const existingUser = await userCollection.findOne(query)
      if(existingUser){
        return res.send({message: 'User already exists', insertedId: null})
        
      }
      const result = await userCollection.insertOne(user);
      res.send(result)
    })
  
    app.get('/users', verifyToken, verifyAdmin, async(req, res)=>{
     
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    app.get('/users/admin/:email', verifyToken, async(req, res) =>{
      const email = req.params.email;
      console.log(2,email)
      console.log(3,req.decoded)
      if(email !== req.decoded.email){
        return res.status(403).send({message: 'forbidden access'})
      }

        const query = {email: email};
        const user = await userCollection.findOne(query);
        let admin = false;
        if(user){
          admin = user?.role === 'admin'
        }
        res.send({admin})
    })

    app.patch('/users/admin/:id', async(req, res) =>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)};
      const updatedDoc = {
        $set:{
          role: "admin"
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc )
      res.send(result)
    })

    app.delete('/users/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await userCollection.deleteOne(query);
      res.send(result)
    })



        // menu related api
    app.get('/menu', async(req, res)=>{
        const result = await menuCollection.find().toArray();
        res.send(result)
    })
        // get reviews
    app.get('/reviews', async(req, res)=>{
        const result = await reviewCollection.find().toArray();
        res.send(result)
    })



      // cart related api
      app.get('/carts', async(req, res)=>{
        const email = req.query.email;
        const query = {email: email}
        const result = await cartCollection.find(query).toArray();
        res.send(result)
    })
    app.post('/carts', async(req, res) =>{
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result)
    })

    // delete cart
    app.delete('/carts/:id', async(req, res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await cartCollection.deleteOne(query)
      res.send(result)
    })














    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res)=>{
    res.send('birtro boss is running on server')
})

app.listen(port, ()=>{
    console.log(`birtro boss is running on port: ${port}`)
})