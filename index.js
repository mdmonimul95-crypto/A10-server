import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
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

    // GET single user by email
    app.get("/api/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const result = await usersCollection.findOne({ email });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch user" });
      }
    });

    // POST create user
    app.post("/api/users", async (req, res) => {
      try {
        const user = req.body;
        const existing = await usersCollection.findOne({ email: user.email });
        if (existing) {
          return res.send({ message: "User already exists" });
        }
        const result = await usersCollection.insertOne({
          ...user,
          status: "active",
          createdAt: new Date(),
        });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to create user" });
      }
    });

    // PATCH update user status (admin block/unblock)
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

    // PATCH update user role (admin)
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

    // DELETE user (admin)
    app.delete("/api/users/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to delete user" });
      }
    });

    // ==================== PRODUCTS ====================

    // GET all products
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

        const result = await productsCollection.find(query).sort(sortOption).toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch products" });
      }
    });

    app.get("/api/products/admin/all", async (req, res) => {
      try {
      const result = await productsCollection.find().sort({ createdAt: -1 }).toArray();
      res.send(result);
     } catch (error) {
      res.status(500).send({ message: "Failed to fetch products for admin" });
     }
     });

    // GET single product
    app.get("/api/products/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await productsCollection.findOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch product" });
      }
    });

    // GET seller's own products
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

    // POST add product (seller)
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

    // PATCH update product (seller)
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

    // PATCH product status (admin approve/reject)
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

    // DELETE product
    app.delete("/api/products/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to delete product" });
      }
    });

    // ==================== ORDERS ====================

    // GET all orders (admin)
    app.get("/api/orders", async (req, res) => {
      try {
        const result = await ordersCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch orders" });
      }
    });

    // GET buyer's orders
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

    // GET seller's orders
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

    // POST create order
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

    // PATCH update order status
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

    // GET all payments (admin)
    app.get("/api/payments", async (req, res) => {
      try {
        const result = await paymentsCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch payments" });
      }
    });

    // GET buyer's payments
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

    // POST save payment
    app.post("/api/payments", async (req, res) => {
      try {
        const payment = req.body;
        const result = await paymentsCollection.insertOne({
          ...payment,
          createdAt: new Date(),
        });

        // update order payment status
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

    // GET product reviews
    app.get("/api/reviews/:productId", async (req, res) => {
      try {
        const productId = req.params.productId;
        const result = await reviewsCollection
          .find({ productId })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch reviews" });
      }
    });

    // POST add review
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

    // GET buyer's wishlist (with product details populated)
    app.get("/api/wishlist/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const wishlistItems = await wishlistCollection
          .find({ buyerEmail: email })
          .toArray();

        // populate product info for each wishlist item
        const populated = await Promise.all(
          wishlistItems.map(async (item) => {
            const product = await productsCollection.findOne({
              _id: new ObjectId(item.productId),
            });
            return {
              ...item,
              product,
            };
          })
        );

        res.send(populated);
      } catch (error) {
        res.status(500).send({ message: "Failed to fetch wishlist" });
      }
    });

    // GET check if a product is already in buyer's wishlist
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

    // POST add product to wishlist
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

    // DELETE remove product from wishlist (by wishlist document id)
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

    // DELETE remove product from wishlist (by buyerEmail + productId)
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

    // ==================== STATS ====================

    // GET platform stats (admin/home)
    app.get("/api/stats", async (req, res) => {
      try {
        const totalUsers = await usersCollection.countDocuments();
        const totalProducts = await productsCollection.countDocuments();
        const totalOrders = await ordersCollection.countDocuments();
        const totalSellers = await usersCollection.countDocuments({ role: "seller" });
        const totalBuyers = await usersCollection.countDocuments({ role: "buyer" });
        const completedOrders = await ordersCollection.countDocuments({ orderStatus: "Delivered" });

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