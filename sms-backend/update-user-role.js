// Script to update user role in MongoDB
// Run this with: node update-user-role.js

const mongoose = require("mongoose");
require("dotenv").config({ path: "./config.env" });

// Connect to MongoDB
const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
    updateUserRole();
  })
  .catch((err) => {
    console.error("Database connection error:", err);
  });

async function updateUserRole() {
  try {
    // Update the user role
    const result = await mongoose.connection.db.collection("users").updateOne(
      {
        $or: [
          { email: "fadumo@email.com" }, // Replace with actual email
          { username: "fadumo" }, // Replace with actual username
          { "profile.firstName": "Fadumo" },
          { "profile.lastName": "abdulkadir" },
        ],
      },
      {
        $set: {
          role: "finance_admin",
          department: "finance",
        },
      }
    );

    if (result.matchedCount === 0) {
      console.log("❌ No user found matching the criteria");
      console.log("Please check the email/username in the script");
    } else if (result.modifiedCount === 0) {
      console.log("ℹ️ User found but role was already finance_admin");
    } else {
      console.log("✅ Successfully updated user role to finance_admin");
    }

    // Show all users with similar names for reference
    const users = await mongoose.connection.db
      .collection("users")
      .find({
        $or: [
          { "profile.firstName": { $regex: "fadumo", $options: "i" } },
          { "profile.lastName": { $regex: "abdulkadir", $options: "i" } },
          { email: { $regex: "fadumo", $options: "i" } },
        ],
      })
      .toArray();

    console.log("\n📋 Found users with similar names:");
    users.forEach((user) => {
      console.log(
        `- Name: ${user.profile?.firstName} ${user.profile?.lastName}`
      );
      console.log(`  Email: ${user.email}`);
      console.log(`  Username: ${user.username}`);
      console.log(`  Role: ${user.role}`);
      console.log("---");
    });
  } catch (error) {
    console.error("❌ Error updating user role:", error);
  } finally {
    mongoose.connection.close();
  }
}
