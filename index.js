const express = require('express');
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
require('dotenv').config();
const cors = require('cors');
var admin = require("firebase-admin");

const app = express();
const port = process.env.PORT || 5000;
const { initializeApp } = require('firebase-admin/app');

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.w5wg2.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

var serviceAccount = require("./to-do-app-b41aa-firebase-adminsdk-xenk3-2b7efa534e.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const idToken = req.headers.authorization.split('Bearer ')[1];
        console.log(idToken)
        try {
            const decodedUser = await admin?.auth()?.verifyIdToken(idToken);
            req.decodedUserEmail = decodedUser.email;
        }
        catch {

        }
    }
    next(); 
}

async function run() {
    try {
        await client.connect();
        const database = client.db('to_do');
        const usersCollection = database.collection('users');
        const notesCollection = database.collection('notes');

        // Add a user
        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user)
            const result = await usersCollection.insertOne(user);
            console.log(result)
            res.json(result);
        });

        // Get a admin
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = {email: email};
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if(user?.role === 'admin') {
                isAdmin = true;
            };
            res.json({admin: isAdmin})
        });

        // Get all users
        app.get('/users', verifyToken, async (req, res) => {
            const email = req.query.email;
            console.log(email)
            console.log(req.decodedUserEmail)
            if (req.decodedUserEmail === email) {
                const cursor = usersCollection.find({});
                const result = await cursor.toArray();
                res.json(result)
            }
            else {
                res.status(401).json({ message: 'User not authorized' })
            }
        });

        // Delete a user
        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await usersCollection.deleteOne(query);
            console.log('Deleting ', result);
            res.json(result)
        });

        // Update subscription status
        app.put('/users/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const option = {upsert: true};
            const updateDoc = {
                $set: {
                    status: 'Approved'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc, option);

            res.json(result)
        });

        // Add a Note
        app.post('/notes', async (req, res) => {
            const note = req.body;
            console.log(note)
            const result = await notesCollection.insertOne(note);
            console.log(result)
            res.json(result);
        });

        // Get all notes
        app.get('/notes', async (req, res) => {
            const cursor = notesCollection.find({});
            const result = await cursor.toArray();
            res.json(result)
        });

        // Delete a Note
        app.delete('/notes/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await notesCollection.deleteOne(query);
            console.log('Deleting ', result);
            res.json(result)
        });

        //UPDATE API
        app.put('/notes/:id', async (req, res) => {
            const id = req.params.id;
            const updatedNote = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    title: updatedNote.title,
                    detail: updatedNote.detail
                },
            };
            const result = await notesCollection.updateOne(filter, updateDoc, options)
            console.log('updating', id)
            res.json(result)
        })
    }finally {
        // await client.close()
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('to do Server is Running')
});

app.listen(port, () => {
    console.log('Server running at port', port);
})