// new_website/lib/new_models.js
import mongoose from "mongoose";

// --- New Equb Schema ---
const newEqubSchema = new mongoose.Schema(
  {
    equbName: { type: String, required: true },
    savingGoal: { type: Number },
    startDate: { type: Date, default: Date.now },
    amount: { type: Number, required: true }, // Equb's payment amount per cycle
    nPeople: { type: Number }, // Target number of people
    drawnMembersFileNumberList: { type: [String], default: [] },
    equbType: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      required: true,
    },
    equbStatus: {
      type: String,
      enum: ["new", "old", "active", "ended"], // Added more statuses
      default: "new",
    },
    listOfBankAccount: [
      {
        bankName: { type: String, required: true },
        accountOwnerName: { type: String, required: true },
        accountNumber: { type: String, required: true },
      },
    ],
    policy: {
      type: { type: String, enum: ["image", "text"] },
      content: { type: [String] }, // Array of strings (text lines or image URLs)
    },
    // Admins are users from the ORIGINAL website
    admins: [
      {
        originalUserId: {
          type: mongoose.Schema.Types.ObjectId,
           // Refers to the User model in the ORIGINAL database
          required: true,
        },
        roleInThisEqub: {
          type: String,
          enum: ["sebsabi", "dagna", "tsehafi"],
          required: true,
        },
        fileNumberInThisEqub: { type: String }, // Optional: if admins have file numbers specific to this Equb
      },
    ],
    // The original user who initiated the creation of this NewEqub
    creatorOriginalUserId: {
      type: mongoose.Schema.Types.ObjectId,
       // Refers to the User model in the ORIGINAL database
    },
  },
  { timestamps: true }
);

// --- New Member Schema ---
// Represents a member's participation in a specific NewEqub
const newMemberSchema = new mongoose.Schema(
  {
    // Link to the user in the ORIGINAL website's User collection
    originalUserId: {
      type: mongoose.Schema.Types.ObjectId,
       // Refers to the User model in the ORIGINAL database
      required: true,
    },
    newEqubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NewEqub", // Refers to NewEqub model in THIS database
      required: true,
    },
    // Details specific to this membership, can be pre-filled from original user
    firstNameInEqub: { type: String, required: true },
    fatherNameInEqub: { type: String, required: true },
    fileNumber: { type: String, required: true }, // Member's file number for this Equb
    memberEqubType: {
      // e.g., full, half, quarter share
      type: String,
      enum: ["full", "half", "quarter"],
      required: true,
    },
    phoneNumberInEqub: { type: String, required: true }, // Validated phone number
    initialAmount: { type: Number, required: true }, // Contribution amount for their share type
    isActive: { type: Boolean, default: true },
    joinDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
// Ensure fileNumber is unique per newEqubId
newMemberSchema.index({ newEqubId: 1, fileNumber: 1 }, { unique: true });


// --- New Payment Schema ---
const newPaymentSchema = new mongoose.Schema(
  {
    newEqubId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NewEqub", // Refers to NewEqub model in THIS database
      required: true,
    },
    // Payer is a NewMember in this NewEqub
    payerMemberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NewMember", // Refers to NewMember model in THIS database
      required: true,
    },
    // Payee is an Admin (an OriginalUser) associated with this NewEqub
    payeeOriginalUserId: {
      type: mongoose.Schema.Types.ObjectId,
       // Refers to the User model in the ORIGINAL database
       // The admin who is designated to receive/verify
    },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now },
    imageProof: { type: String }, // URL or path to image
    isApproved: { type: Boolean, default: false },
    // Admin from ORIGINAL website who approved this payment
    approvedByOriginalUserId: {
      type: mongoose.Schema.Types.ObjectId,
       // Refers to the User model in the ORIGINAL database
      default: null,
    },
    selfPaid: { type: Boolean, default: false }, // True if member initiated payment upload
    // Denormalized payer info for convenience if needed, but can be populated from NewMember
    // firstName: { type: String },
    // fatherName: { type: String },
    // phoneNumber: { type: String },
    // fileNumber: { type: String },
  },
  { timestamps: true }
);

// Export models for the new website
// Ensure you have a separate mongoose connection for this new database
// For example, new_mongoose.model(...)
// Here, we assume a naming convention for clarity if used in the same project context temporarily
export const NewEqub = mongoose.models.NewEqub || mongoose.model("NewEqub", newEqubSchema);
export const NewMember = mongoose.models.NewMember || mongoose.model("NewMember", newMemberSchema);
export const NewPayment = mongoose.models.NewPayment || mongoose.model("NewPayment", newPaymentSchema);