import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("ReSell Hub Server Running!");
});

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("MongoDB Connected Successfully");

    const db = client.db("resell_hub");

    const usersCollection = db.collection("users");
    const productsCollection = db.collection("products");
    const ordersCollection = db.collection("orders");
    const paymentsCollection = db.collection("payments");
    const reviewsCollection = db.collection("reviews");
    const wishlistCollection = db.collection("wishlist");

    // ==================== USERS ====================

    // GET all users (admin)
    app.get("/api/users", async (req, res) => {
      try {
        const result = await usersCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch users" });
      }
    });

    // ✅ PATCH profile — GET /:email এর আগে
    app.patch("/api/users/profile/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const { name, phone, location, image, role } = req.body;

        const result = await usersCollection.updateOne(
          { email },
          {
            $set: {
              name,
              phone,
              location,
              image,
              ...(role && { role }),
            },
          }
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to update profile" });
      }
    });

    // ✅ PATCH status — GET /:email এর আগে
    app.patch("/api/users/:id/status", async (req, res) => {
      try {
        const id = req.params.id;
        const { status } = req.body;
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to update user status" });
      }
    });

    // ✅ PATCH role — GET /:email এর আগে
    app.patch("/api/users/:id/role", async (req, res) => {
      try {
        const id = req.params.id;
        const { role } = req.body;
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { role } }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to update user role" });
      }
    });

    // ✅ DELETE — GET /:email এর আগে
    app.delete("/api/users/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await usersCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to delete user" });
      }
    });

    // POST create or update user (upsert)
    app.post("/api/users", async (req, res) => {
      try {
        const user = req.body;
        const result = await usersCollection.updateOne(
          { email: user.email },
          {
            $set: {
              name: user.name,
              email: user.email,
              image: user.image || "",
              role: user.role || "buyer",
              phone: user.phone || "",
              location: user.location || "",
              status: "active",
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to create user" });
      }
    });

    // ✅ GET single user — সবার শেষে
    app.get("/api/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const result = await usersCollection.findOne({ email });
        res.send(result || {});
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch user" });
      }
    });

    // ==================== PRODUCTS ====================

    app.get("/api/products", async (req, res) => {
      try {
        const { category, condition, search, sort } = req.query;
        let query = { status: "available" };

        if (category) query.category = category;
        if (condition) query.condition = condition;
        if (search) {
          query.$or = [
            { title: { $regex: search, $options: "i" } },
            { category: { $regex: search, $options: "i" } },
          ];
        }

        let sortOption = {};
        if (sort === "price_asc") sortOption = { price: 1 };
        if (sort === "price_desc") sortOption = { price: -1 };

        const result = await productsCollection
          .find(query)
          .sort(sortOption)
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch products" });
      }
    });

    // ✅ specific routes আগে
    app.get("/api/products/admin/all", async (req, res) => {
      try {
        const result = await productsCollection
          .find()
          .sort({ createdAt: -1 })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch products for admin" });
      }
    });

    app.get("/api/products/seller/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const result = await productsCollection
          .find({ "sellerInfo.email": email })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch seller products" });
      }
    });

    app.patch("/api/products/:id/status", async (req, res) => {
      try {
        const id = req.params.id;
        const { status } = req.body;
        const result = await productsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status } }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to update product status" });
      }
    });

    app.patch("/api/products/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updates = req.body;
        const result = await productsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updates }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to update product" });
      }
    });

    app.delete("/api/products/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await productsCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to delete product" });
      }
    });

    app.post("/api/products", async (req, res) => {
      try {
        const product = req.body;
        const result = await productsCollection.insertOne({
          ...product,
          status: "pending",
          createdAt: new Date(),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to add product" });
      }
    });

    // ✅ GET single product — শেষে
    app.get("/api/products/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await productsCollection.findOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch product" });
      }
    });

    // ==================== ORDERS ====================

    app.get("/api/orders", async (req, res) => {
      try {
        const result = await ordersCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch orders" });
      }
    });

    app.get("/api/orders/buyer/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const result = await ordersCollection
          .find({ "buyerInfo.email": email })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch buyer orders" });
      }
    });

    app.get("/api/orders/seller/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const result = await ordersCollection
          .find({ "sellerInfo.email": email })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch seller orders" });
      }
    });

    app.post("/api/orders", async (req, res) => {
      try {
        const order = req.body;
        const result = await ordersCollection.insertOne({
          ...order,
          orderStatus: "Pending",
          createdAt: new Date(),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to create order" });
      }
    });

    app.patch("/api/orders/:id/status", async (req, res) => {
      try {
        const id = req.params.id;
        const { orderStatus } = req.body;
        const result = await ordersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { orderStatus } }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to update order status" });
      }
    });

    // ==================== PAYMENTS ====================

    app.get("/api/payments", async (req, res) => {
      try {
        const result = await paymentsCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch payments" });
      }
    });

    app.get("/api/payments/buyer/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const result = await paymentsCollection
          .find({ buyerEmail: email })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch payments" });
      }
    });

    app.post("/api/payments", async (req, res) => {
      try {
        const payment = req.body;
        const result = await paymentsCollection.insertOne({
          ...payment,
          createdAt: new Date(),
        });

        await ordersCollection.updateOne(
          { _id: new ObjectId(payment.orderId) },
          { $set: { paymentStatus: "paid" } }
        );

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to save payment" });
      }
    });

    // ==================== REVIEWS ====================

    app.get("/api/reviews/:productId", async (req, res) => {
      try {
        const productId = req.params.productId;
        const result = await reviewsCollection.find({ productId }).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch reviews" });
      }
    });

    app.post("/api/reviews", async (req, res) => {
      try {
        const review = req.body;
        const result = await reviewsCollection.insertOne({
          ...review,
          createdAt: new Date(),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to add review" });
      }
    });

    // ==================== WISHLIST ====================

    app.get("/api/wishlist/check/:email/:productId", async (req, res) => {
      try {
        const { email, productId } = req.params;
        const result = await wishlistCollection.findOne({
          buyerEmail: email,
          productId,
        });
        res.send({ inWishlist: !!result, wishlistId: result?._id || null });
      } catch (error) {
        res.status(500).send({ message: "Failed to check wishlist" });
      }
    });

    app.delete("/api/wishlist/:email/:productId", async (req, res) => {
      try {
        const { email, productId } = req.params;
        const result = await wishlistCollection.deleteOne({
          buyerEmail: email,
          productId,
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to remove from wishlist" });
      }
    });

    app.get("/api/wishlist/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const wishlistItems = await wishlistCollection
          .find({ buyerEmail: email })
          .toArray();

        const populated = await Promise.all(
          wishlistItems.map(async (item) => {
            const product = await productsCollection.findOne({
              _id: new ObjectId(item.productId),
            });
            return { ...item, product };
          })
        );

        res.send(populated);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch wishlist" });
      }
    });

    app.post("/api/wishlist", async (req, res) => {
      try {
        const { buyerEmail, productId } = req.body;

        if (!buyerEmail || !productId) {
          return res
            .status(400)
            .send({ message: "buyerEmail and productId are required" });
        }

        const existing = await wishlistCollection.findOne({
          buyerEmail,
          productId,
        });
        if (existing) {
          return res.send({ message: "Product already in wishlist" });
        }

        const result = await wishlistCollection.insertOne({
          buyerEmail,
          productId,
          createdAt: new Date(),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to add to wishlist" });
      }
    });

    app.delete("/api/wishlist/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await wishlistCollection.deleteOne({
          _id: new ObjectId(id),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to remove from wishlist" });
      }
    });
    

    // ==================== REPORTS ====================

const reportsCollection = db.collection("reports");

// GET all reports (admin)
app.get("/api/reports", async (req, res) => {
  try {
    const result = await reportsCollection
      .find()
      .sort({ createdAt: -1 })
      .toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch reports" });
  }
});

// POST create report
app.post("/api/reports", async (req, res) => {
  try {
    const report = req.body;
    const result = await reportsCollection.insertOne({
      ...report,
      status: "pending",
      createdAt: new Date(),
    });
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to create report" });
  }
});

// PATCH update report status
app.patch("/api/reports/:id/status", async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    const result = await reportsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status } }
    );
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to update report status" });
  }
});
    // ==================== STATS ====================

    app.get("/api/stats", async (req, res) => {
      try {
        const totalUsers = await usersCollection.countDocuments();
        const totalProducts = await productsCollection.countDocuments();
        const totalOrders = await ordersCollection.countDocuments();
        const totalSellers = await usersCollection.countDocuments({
          role: "seller",
        });
        const totalBuyers = await usersCollection.countDocuments({
          role: "buyer",
        });
        const completedOrders = await ordersCollection.countDocuments({
          orderStatus: "Delivered",
        });

        res.send({
          totalUsers,
          totalProducts,
          totalOrders,
          totalSellers,
          totalBuyers,
          completedOrders,
        });
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch stats" });
      }
    });
  } catch (error) {
    console.log(error);
  }
}

run();

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});