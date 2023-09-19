const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const port = process.env.PORT || 8080;
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

require('dotenv').config();

// MIDDLEWARE:----------------------->>>>
app.use(cors());
app.use(express.json());

// CUSTOM ERROR HANDLER MIDDLEWARE:----------------------->>>>
app.use((err, req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173'); // Update this with your client's origin
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  console.error(err.stack);
  res.status(500).send('Something went wrong!');
  next();
});

// JWT VERIFICATION CONFIG:----------------------->>>>
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: 'unauthorized access' });
  }

  // BEARER TOKEN:
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: 'unauthorized access' });
    }
    req.decoded = decoded;
    next();
  });
};

// VERIFY ADMIN: (USE verifyJWT BEFORE USING verifyAdmin)--->>>>
const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await usersCollection.findOne(query);
  if (user?.role !== 'admin') {
    return res.status(403).send({ error: true, message: 'forbidden message' });
  }
  next();
};

// SOCKET-CONNECTION:----------------------->>>>
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    // origin: 'https://cyco-inc.netlify.app',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User Disconnected: ${socket.id}`);
  });

  socket.on('send_notification', (data) => {
    console.log(data);
    // Emit the received notification to all connected clients except the sender
    socket.broadcast.emit('receive_notification', data);
  });
});

// SEND SUBSCRIPTION E-MAIL:----------------------->>>>
const sendMail = (emailDate, emailAddress) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASS,
    },
  });
  const mailOptions = {
    from: process.env.EMAIL,
    to: emailAddress,
    subject: emailDate?.subject,
    html: `<p>${emailDate?.message}</p>`,
  };
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
};

// DATABASE:----------------------->>>>
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cyco.ehplf2h.mongodb.net/?retryWrites=true&w=majority`;
// const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-15myamh-shard-00-00.ehplf2h.mongodb.net:27017,ac-15myamh-shard-00-01.ehplf2h.mongodb.net:27017,ac-15myamh-shard-00-02.ehplf2h.mongodb.net:27017/?ssl=true&replicaSet=atlas-7hujl1-shard-0&authSource=admin&retryWrites=true&w=majority`;

// CREATE MONGO-CLIENT:----------------------->>>>
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
});

// ----------------------------->>>>
// EXPRESS SERVER API ENDPOINTS->>>>
// ----------------------------->>>>
async function run() {
  try {
    await client.connect((error) => {
      if (error) {
        // console.log(error);
        return;
      }
    });

    // DATABASE COLLECTION:----------------------->>>>
    const moviesCollection = client.db("cyco").collection("movies");
    const liveTVCollection = client.db("cyco").collection("liveTV");
    const usersCollection = client.db("cyco").collection("users");
    const seriesCollection = client.db("cyco").collection("series");
    const queryCollection = client.db("cyco").collection("forumQueries");
    const paymentsCollection = client.db("cyco").collection("payments");
    const historyCollection = client.db("cyco").collection("history");
    const feedbacksCollection = client.db("cyco").collection("feedbacks");
    const reviewsCollection = client.db("cyco").collection("reviews");
    const movieReviewsCollection = client.db("cyco").collection("movieReviews");
    const manageSubscriptionsCollection = client
      .db('cyco')
      .collection('manageSubscriptions');

    // POST JWT:----------------------->>>>
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '24h',
      });
      res.send({ token });
    });

    // MOVIES:----------------------->>>>
    app.get('/movies', async (req, res) => {
      try {
        const result = await moviesCollection.find().toArray();
        res.status(200).json(result);
        // return result;
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.post('/movies', async (req, res) => {
      try {
        const movieData = req.body;
        const result = await moviesCollection.insertOne(movieData);
        // res.send(result)

        if (result.insertedCount === 1) {
          res.status(201).json({ message: 'Movie saved successfully' });
        } else {
          res.status(500).json({ error: 'Failed to save the movie' });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Live tv route:----------------------->>>>
    app.get('/liveTV', async (req, res) => {
      try {
        const result = await liveTVCollection.find().toArray();
        res.status(200).json(result);
        // return result;
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.post('/liveTV', async (req, res) => {
      try {
        const movieData = req.body;
        const result = await liveTVCollection.insertOne(movieData);
        // res.send(result)

        if (result.insertedCount === 1) {
          res
            .status(201)
            .json({ message: 'Live Tv Channel saved successfully' });
        } else {
          res.status(500).json({ error: 'Failed to save the Live TV Channel' });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // app.delete("/liveTV/:id", async (req, res) => {
    //   const id = req.params.id;
    //   console.log(id);
    //   const query = { _id: new ObjectId(id) };
    //   const result = await liveTVCollection.deleteOne(query);
    //   console.log("delete id", result);
    //   if (result.deletedCount > 0) {
    //     res.json({ success: true, message: "Item deleted successfully" });
    //   } else {
    //     res.status(404).json({ success: false, message: "Item not found" });
    //   }
    // });

    // Define a route for retrieving channel information by ID
    app.get("/liveTV/:id", async (req, res) => {
      const id = req.params.id;

      try {
        const query = { _id: new ObjectId(id) };
        const channel = await liveTVCollection.findOne(query);

        if (channel) {
          // Channel found, send it as a response
          res.json({ success: true, data: channel });
        } else {
          // No matching channel found
          res
            .status(404)
            .json({ success: false, message: "Channel not found" });
        }
      } catch (error) {
        // Handle any errors that occurred during the retrieval process
        console.error("Error:", error);
        res.status(500).json({
          success: false,
          message: "An error occurred while retrieving the channel",
        });
      }
    });

    app.delete("/liveTV/:id", async (req, res) => {
      const id = req.params.id;

      try {
        const query = { _id: new ObjectId(id) };
        const result = await liveTVCollection.deleteOne(query);

        if (result.deletedCount > 0) {
          // Successfully deleted the channel
          res.json({ success: true, message: "Item deleted successfully" });
        } else {
          // No matching channel found
          res.status(404).json({ success: false, message: "Item not found" });
        }
      } catch (error) {
        // Handle any errors that occurred during the deletion process
        console.error("Error:", error);
        res.status(500).json({
          success: false,
          message: "An error occurred while deleting the item",
        });
      }
    });

    // SERIES:----------------------->>>>
    app.get('/series', verifyJWT, async (req, res) => {
      try {
        const result = await seriesCollection.find().toArray();
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    // Warning: use verifyJWT before using verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req?.decoded?.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== 'admin') {
        return res
          .status(403)
          .send({ error: true, message: 'forbidden message' });
      }
      next();
    };

    // USERS:----------------------->>>>
    app.get('/users', async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/user/:email', async (req, res) => {
      try {
        const { email } = req.params;
        const userData = await usersCollection.findOne({ email });
        if (userData) {
          res.status(200).json(userData);
        } else {
          res.status(404).json({ error: 'User not found' });
        }
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.post('/register', async (req, res) => {
      try {
        const { username, email, password, role, photoUrl } = req.body;

        // Check if the email is already registered
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
          return res.status(409).json({ error: 'Email already registered' });
        }

        // Create a new user document
        await usersCollection.insertOne({
          username,
          role,
          email,
          password,
          photoUrl,
          wishlist: [],
        });

        res.status(201).json({ message: 'User registered successfully' });
      } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/getUser', async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
    // PUT/PATCH: Update an item
    // Update A room
    app.put('/updateUserData/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = { email: email };
      const options = { upsert: true };

      const updateDoc = {
        $set: user,
      };

      const result = await usersCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    // edit user
    app.put('/updateUserData/:id', async (req, res) => {
      const data = req.body;
      const filter = { _id: new ObjectId(req.params.id) };
      const updateDoc = {
        $set: data,
      };
      try {
        const result = await usersCollection.updateMany(filter, updateDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send(error);
      }
    });

    // Route to save watch time
    app.post('/save-watch-time', async (req, res) => {
      try {
        const { userId, movieId, duration } = req.body;

        const watchTimeData = {
          userId,
          movieId,
          startTime: new Date(),
          endTime: new Date(new Date().getTime() + duration * 1000),
        };

        // Save the watch time data to your MongoDB collection
        const result = await usersCollection.insertOne(watchTimeData);

        if (result.insertedCount === 1) {
          res.status(201).json({ message: 'Watch time saved successfully' });
        } else {
          res.status(500).json({ error: 'Failed to save watch time' });
        }
      } catch (error) {
        console.error('Error saving watch time:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Route to get watch time analytics for a user
    app.get('/user-watch-time/:userId', async (req, res) => {
      try {
        const userId = req.params.userId;

        // Calculate total watch time for the user
        const watchTimeRecords = await usersCollection
          .find({ userId })
          .toArray();

        const totalWatchTime = watchTimeRecords.reduce((acc, record) => {
          const durationInSeconds = (record.endTime - record.startTime) / 1000;
          return acc + durationInSeconds;
        }, 0);

        res.status(200).json({ totalWatchTime });
      } catch (error) {
        console.error('Error fetching watch time analytics:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // manageSubscriptions:----------------------->>>>
    app.get('/getManageSubscriptions', async (req, res) => {
      try {
        const result = await manageSubscriptionsCollection.find().toArray();
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    // PUT/PATCH: Update an item
    // Update A room
    app.put('/updateManageSubscriptions/:id', async (req, res) => {
      const data = req.body;
      console.log(data);
      const filter = { _id: new ObjectId(req.params.id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: data,
      };
      const result = await manageSubscriptionsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // Update history data by ID
    app.post('/history', async (req, res) => {
      const data = req.body;
      const result = await historyCollection.insertOne(data);
      // console.log(result);
      res.send(result);
    });

    //get history in db
    app.get('/getHistoryData', async (req, res) => {
      const result = await historyCollection.find().toArray();
      res.send(result);
    });

    //delete a history data from db
    app.delete('/history/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await historyCollection.deleteOne(query);
      res.send(result);
    });

    // Check admin
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }

      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' };
      res.send(result);
    });

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin',
        },
      };

      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // WISHLIST----------------------->>>>
    app.post('/wishlist', async (req, res) => {
      try {
        const { user, movie } = req.body;
        console.log(user?.email);

        if (!user || !user?.email) {
          return res.status(400).json({ error: 'Invalid user data' });
        }

        const userExists = await usersCollection.findOne({
          email: user?.email,
        });

        if (!userExists) {
          return res.status(404).json({ error: 'User not found' });
        }

        const alreadyInWishlist = userExists?.wishlist?.some(
          (wishlist) => wishlist?._id === movie?._id
        );

        if (alreadyInWishlist) {
          return res
            .status(200)
            .json({ message: 'Already added to wishlist!' });
        }

        const updateResult = await usersCollection.updateOne(
          { email: user?.email },
          { $addToSet: { wishlist: movie } }
        );

        if (updateResult?.modifiedCount === 1) {
          res.status(200).json({ message: 'Movie added to wishlist!' });
        } else if (updateResult?.matchedCount === 1) {
          res.status(403).json({ message: 'Already added to wishlist!' });
        } else {
          res.status(404).json({ error: 'User not found!' });
        }
      } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error!' });
      }
    });

    app.delete('/wishlist/:email/:movieId', async (req, res) => {
      try {
        const { email, movieId } = req.params;
        console.log(email, movieId);

        const user = await usersCollection.findOne({ email: email });
        if (!user) {
          return res?.status(404).json({ error: 'User not found!' });
        }

        const movieIndex = user?.wishlist?.findIndex(
          (movie) => movie?._id === movieId
        );

        if (movieIndex === -1) {
          return res?.status(404).json({ error: 'Movie not found!' });
        }

        user?.wishlist?.splice(movieIndex, 1);

        await usersCollection.updateOne(
          { email: email },
          { $set: { wishlist: user?.wishlist } }
        );

        res?.status(200).json({ message: 'Movie removed from wishlist!' });
      } catch (error) {
        console.log('Error removing movie from wishlist:', error);
        res?.status(500).json({ error: 'Internal Server Error!' });
      }
    });

    // PAYMENT:----------------------->>>>
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      console.log(payment);
      const result = await paymentsCollection.insertOne(payment);
      // Send confirmation email to guest
      sendMail(
        {
          subject: 'Payment Successful!',
          message: `Payment Id: ${result?.insertedId}, TransactionId: ${payment.transectionId}`,
        },
        payment?.email
      );

      //send confirmation email to host email account
      sendMail(
        {
          subject: 'CYCO SUBSCRIPTION ACTIVATED!',
          message: `Booking Id: ${result?.insertedId}, TransactionId: ${payment.transactionId}. Check dashboard for more info`,
        },
        payment?.admin?.email
      );

      res.send(result);
    });

    app.get('/monthly-revenue', async (req, res) => {
      try {
        const monthlyRevenue = await paymentsCollection
          .aggregate([
            {
              $match: {
                date: { $type: 'date' }, // Filter out documents with invalid date values
              },
            },
            {
              $group: {
                _id: {
                  year: { $year: '$date' },
                  month: { $month: '$date' },
                },
                totalRevenue: { $sum: '$amount' },
              },
            },
          ])
          .toArray();

        res.json(monthlyRevenue);
      } catch (error) {
        console.error('Error fetching monthly revenue:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    //get payment history in db
    // Create an API endpoint to fetch data
    app.get('/getPaymentHistory', async (req, res) => {
      try {
        const data = await paymentsCollection.find().toArray(); // Replace with your query
        res.json(data);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
      }
    });

    // FORUM QUERIES:----------------------->>>>
    app.post('/query', async (req, res) => {
      try {
        const { user, query } = req.body;
        // console.log(user, query);

        const querySlot = await usersCollection.updateOne(
          { email: user?.email },
          { $addToSet: { querySlot: query } }
        );
        // console.log(querySlot);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // FORUM:----------------------->>>>
    app.post('/forumQueries', async (req, res) => {
      try {
        const newQuery = req.body;
        // console.log(req.body);

        const forumQueries = await queryCollection.insertOne(newQuery);
        res.send(forumQueries);
        // console.log(forumQueries);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/forumQueries', async (req, res) => {
      try {
        const fetchedQueries = await queryCollection.find().toArray();
        res.status(200).json(fetchedQueries);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.post('/forumQueries', async (req, res) => {
      try {
        const newQuery = req.body;
        const result = await queryCollection.insertOne(newQuery);
        res.status(201).json(result.ops[0]);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // QUERY COMMENT ENDPOINT:
    app.post('/forumQueries/:id/comments', async (req, res) => {
      try {
        const queryId = req.params.id;
        const newComment = req.body.comment;
        const userId = req.user?._id;

        const updatedQuery = await queryCollection.updateOne(
          { _id: new ObjectId(queryId) },
          { $addToSet: { comments: newComment, userId } }
        );

        if (updatedQuery.modifiedCount === 1) {
          res.json({ success: true });
        } else {
          res.json({ success: false });
        }
      } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.get('/forumQueries/:id/comments', async (req, res) => {
      try {
        const queryId = req.params.id;

        const query = await queryCollection.findOne({
          _id: new ObjectId(queryId),
        });

        if (!query) {
          res.status(404).json({ error: 'Query not found' });
          return;
        }

        const comments = query?.comments;
        console.log(comments);
        res.json({ success: true, comments });
      } catch (error) {
        console.log('Error fetching comments:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // UPDATE QUERY VIEWS BY ID:
    app.put('/forumQueries/:id', async (req, res) => {
      try {
        const queryId = req.params.id;
        const updatedViews = req.body.views;

        const updatedQuery = await queryCollection.updateOne(
          { _id: new ObjectId(queryId) },
          { $set: { views: updatedViews } }
        );

        if (updatedQuery.modifiedCount === 1) {
          res.json({ success: true });
        } else {
          res.json({ success: false });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // Movie Reviews :----------------------->>>
    app.get('/movieReviews', async (req, res) => {
      try {
        const fetchedReviews = await movieReviewsCollection.find().toArray();
        console.log(fetchedReviews);
        res.status(200).json(fetchedReviews);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.post('/reviews', async (req, res) => {
      try {
        const { user, review } = req.body;
        // Update the user document in the users collection to add the review to their reviewSlot
        const result = await usersCollection.updateOne(
          { email: user?.email },
          { $addToSet: { reviewSlot: review } }
        );
        if (result.modifiedCount === 1) {
          // If a document was modified, it means the review was added successfully
          res.status(201).json({ message: 'Review added successfully' });
        } else {
          // If no document was modified, it means the user with the specified email was not found
          res.status(404).json({ message: 'User not found' });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    app.post('/movieReviews', async (req, res) => {
      try {
        const newMovieReview = req.body;
        const movieReviews = await movieReviewsCollection.insertOne(
          newMovieReview
        );
        res.send(movieReviews);
      } catch (error) {
        console.log(error);
        res.status(500).join({ error: 'Internal server error' });
      }
    });

    // Creating a route to handle the GET request for feedbacks
    app.get('/feedbacks', async (req, res) => {
      try {
        // Query the collection to retrieve all feedbacks
        const feedbacks = await feedbacksCollection.find({}).toArray();

        // Return the feedbacks as a JSON response
        res.status(200).json(feedbacks);
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
      }
    });

    // Creating a route to handle the POST request for feedbacks
    app.post('/feedbacks', async (req, res) => {
      try {
        const newFeedback = req.body; // Assuming your input field is named "feedback"

        // Insert the feedback document into the collection
        const result = await feedbacksCollection.insertOne(newFeedback);

        res.status(201).json({
          message: 'Feedback added successfully',
          insertedId: result.insertedId,
        });
        //         res
        //           .status(201)
        //           .json({
        //             message: "Feedback added successfully",
        //             insertedId: result.insertedId,
        //           });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
      }
    });

    // UPDATE QUERY VOTE COUNT:
    const updateVoteCount = async (queryId, newVoteCount) => {
      try {
        const updateQuery = await queryCollection.updateOne(
          { _id: new ObjectId(queryId) },
          { $set: { voteCount: newVoteCount } },
          { returnOriginal: true }
        );

        if (!updateQuery.value) {
          return { success: false, message: 'Query not found!' };
        }
        return { success: true, message: 'Vote count successfully!' };
      } catch (error) {
        console.log('Error updating vote count:', error);
        return { success: false, message: 'Internal server error' };
      }
    };

    app.put('/forumQueries/:queryId', async (req, res) => {
      // const queryId = req.params.id;
      const queryId = req.params.queryId;
      const { voteCount } = req.body;
      const voteType = req.body;
      const userId = req.decoded;

      console.log('vote handler:', queryId, voteType, userId);

      try {
        const query = await queryCollection.findOne({
          _id: new ObjectId(queryId),
        });

        if (!query) {
          return res.status(404).json({ error: 'Query not found!' });
        }

        if (voteType === 'upvote') {
          if (query?.upvote.includes(userId)) {
            return res.status(400).json({ error: 'Already upvoted!' });
          }

          if (query?.downvotes.includes(userId)) {
            const downvoteIndex = query.downvotes.indexOf(userId);
            query.downvotes.splice(downvoteIndex, 1);
          }

          query.upvotes.push(userId);
        } else if (voteType === 'downvote') {
          if (query.downvotes.includes(userId)) {
            return res
              .status(400)
              .json({ error: 'User already downvoted this query!' });
          }

          if (query.upvotes.includes(userId)) {
            const upvoteIndex = query.upvotes.indexOf(userId);
            query.upvotes.splice(upvoteIndex, 1);
          }

          query.downvotes.push(userId);
        } else {
          return res.status(400).json({ error: 'Invalid vote type!' });
        }

        await queryCollection.updateOne(
          { _id: new ObjectId(queryId) },
          {
            $set: {
              upvotes: query?.upvotes,
              downvotes: query?.downvotes,
            },
          }
        );

        res.json({ success: true });
      } catch (error) {
        console.error('Error updating vote count:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });

    // app.delete('/forumQueries/votes/:id', async (req, res) => {
    //   const queryId = req.params.id;

    //   try {
    //     const query = await queryCollection.findOne(queryId);

    //     if (!query) {
    //       res.status(404).json({ error: 'Query not found' });
    //       return;
    //     }

    //     await queryCollection.deleteOne({ _id: queryId });
    //     res.json({ message: 'Query deleted successfully' });
    //   } catch (error) {
    //     console.error(error);
    //     res.status(500).json({ error: 'Internal Server Error' });
    //   }
    // });

    app.delete('/forumQueries/:id', async (req, res) => {
      try {
        const objectId = req.params.id;
        const deletedObject = await queryCollection.deleteOne(objectId);

        if (!deletedObject) {
          return res.status(404).json({ message: 'Object not found' });
        }
        res.json({ message: 'Object deleted successfully', deletedObject });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    // app.put('/forumQueries/:id', async (req, res) => {
    //   try {
    //     const queryId = req.params.id;
    //     const newComment = req.body;

    //     const existingQuery = await queryCollection.findOne({
    //       _id: new ObjectId(queryId),
    //     });

    //     if (!existingQuery) {
    //       return res?.status(404).json({ error: 'Query not found!' });
    //     }

    //     existingQuery.comments.push(newComment);

    //     await queryCollection.updateOne(
    //       { _id: new ObjectId(queryId) },
    //       { $set: { comments: existingQuery?.comments } }
    //     );

    //     res.json({ success: true });
    //   } catch (error) {
    //     console.error(error);
    //     res.status(500).json({ error: 'Internal server error' });
    //   }
    // });

    // CHECK SERVER CONNECTION:----------------------->>>>
    await client.db('admin').command({ ping: 1 });
    console.log('Hey Dev! No pain No gain.. Successfully Connected MongoDb');
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('cyco-engine');
});

server.listen(port, () => {
  console.log(`SERVER IS RUNNING ON PORT ${port}`);
});
