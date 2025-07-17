// // new_website/lib/new_models.js
// import mongoose from "mongoose";

// // --- New Equb Schema ---
// const newEqubSchema = new mongoose.Schema(
//   {
//     equbName: { type: String, required: true },
//     savingGoal: { type: Number },
//     startDate: { type: Date, default: Date.now },
//     amount: { type: Number, required: true }, // Equb's payment amount per cycle
//     nPeople: { type: Number }, // Target number of people
//     drawnMembersFileNumberList: { type: [String], default: [] },
//     equbType: {
//       type: String,
//       enum: ["daily", "weekly", "monthly"],
//       required: true,
//     },
//     equbStatus: {
//       type: String,
//       enum: ["new", "old", "active", "ended"], // Added more statuses
//       default: "new",
//     },
//     listOfBankAccount: [
//       {
//         bankName: { type: String, required: true },
//         accountOwnerName: { type: String, required: true },
//         accountNumber: { type: String, required: true },
//       },
//     ],
//     policy: {
//       type: { type: String, enum: ["image", "text"] },
//       content: { type: [String] }, // Array of strings (text lines or image URLs)
//     },
//     // Admins are users from the ORIGINAL website
//     admins: [
//       {
//         originalUserId: {
//           type: mongoose.Schema.Types.ObjectId,
//            // Refers to the User model in the ORIGINAL database
//           required: true,
//         },
//         roleInThisEqub: {
//           type: String,
//           enum: ["sebsabi", "dagna", "tsehafi"],
//           required: true,
//         },
//         fileNumberInThisEqub: { type: String }, // Optional: if admins have file numbers specific to this Equb
//       },
//     ],
//     // The original user who initiated the creation of this NewEqub
//     creatorOriginalUserId: {
//       type: mongoose.Schema.Types.ObjectId,
//        // Refers to the User model in the ORIGINAL database
//     },
//   },
//   { timestamps: true }
// );

// // --- New Member Schema ---
// // Represents a member's participation in a specific NewEqub
// const newMemberSchema = new mongoose.Schema(
//   {
//     // Link to the user in the ORIGINAL website's User collection
//     originalUserId: {
//       type: mongoose.Schema.Types.ObjectId,
//        // Refers to the User model in the ORIGINAL database
//       required: true,
//     },
//     newEqubId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "NewEqub", // Refers to NewEqub model in THIS database
//       required: true,
//     },
//     // Details specific to this membership, can be pre-filled from original user
//     firstNameInEqub: { type: String, required: true },
//     fatherNameInEqub: { type: String, required: true },
//     fileNumber: { type: String, required: true }, // Member's file number for this Equb
//     memberEqubType: {
//       // e.g., full, half, quarter share
//       type: String,
//       enum: ["full", "half", "quarter"],
//       required: true,
//     },
//     phoneNumberInEqub: { type: String, required: true }, // Validated phone number
//     initialAmount: { type: Number, required: true }, // Contribution amount for their share type
//     isActive: { type: Boolean, default: true },
//     joinDate: { type: Date, default: Date.now },
//   },
//   { timestamps: true }
// );
// // Ensure fileNumber is unique per newEqubId
// newMemberSchema.index({ newEqubId: 1, fileNumber: 1 }, { unique: true });


// // --- New Payment Schema ---
// const newPaymentSchema = new mongoose.Schema(
//   {
//     newEqubId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "NewEqub", // Refers to NewEqub model in THIS database
//       required: true,
//     },
//     // Payer is a NewMember in this NewEqub
//     payerMemberId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "NewMember", // Refers to NewMember model in THIS database
//       required: true,
//     },
//     // Payee is an Admin (an OriginalUser) associated with this NewEqub
//     payeeOriginalUserId: {
//       type: mongoose.Schema.Types.ObjectId,
//        // Refers to the User model in the ORIGINAL database
//        // The admin who is designated to receive/verify
//     },
//     amount: { type: Number, required: true },
//     paymentDate: { type: Date, default: Date.now },
//     imageProof: { type: String }, // URL or path to image
//     isApproved: { type: Boolean, default: false },
//     // Admin from ORIGINAL website who approved this payment
//     approvedByOriginalUserId: {
//       type: mongoose.Schema.Types.ObjectId,
//        // Refers to the User model in the ORIGINAL database
//       default: null,
//     },
//     selfPaid: { type: Boolean, default: false }, // True if member initiated payment upload
//     // Denormalized payer info for convenience if needed, but can be populated from NewMember
//     // firstName: { type: String },
//     // fatherName: { type: String },
//     // phoneNumber: { type: String },
//     // fileNumber: { type: String },
//   },
//   { timestamps: true }
// );

// const userSchema = new mongoose.Schema(
//   {
//     firstName: String,
//     lastName: String,
//     motherName: String,
//     oprator: Boolean,
//     phoneNumber: String,
//     password: String,
//     isSystemAdmin: Boolean,
//     activeEqubs: [String],
//     collectorOf: { type: mongoose.Schema.Types.Mixed, default: null },
//     managerMembers: { type: mongoose.Schema.Types.Mixed, default: null },
//     img: String,
//   },
//   { timestamps: true }
// );

// export const User = mongoose.models.User || mongoose.model("User", userSchema);
// // Export models for the new website
// // Ensure you have a separate mongoose connection for this new database
// // For example, new_mongoose.model(...)
// // Here, we assume a naming convention for clarity if used in the same project context temporarily
// export const Equb = mongoose.models.NewEqub || mongoose.model("NewEqub", newEqubSchema);
// export const Member = mongoose.models.NewMember || mongoose.model("NewMember", newMemberSchema);
// export const Payment = mongoose.models.NewPayment || mongoose.model("NewPayment", newPaymentSchema);

//model file from the first repo
import mongoose from "mongoose";

const userSchema = new mongoose.Schema( // avoid default values
  {
    underManager: { type: String },
    firstName: { type: String },
    lastName: { type: String },
    motherName: { type: String },
    img: { type: String },
    idFront: { type: String }, // new
    idBack: { type: String }, // new
    role: {
      // new
      type: String,
      enum: ["sebsabi", "dagna", "tsehafi"],
    },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: "Agent" }, // [obj, new] // i will use it to ckeck like admin
    // phone number must be unique!
    oprator: { type: Boolean, default: false },
    phoneNumber: { type: String, unique: true },
    password: { type: String },
    isSystemAdmin: { type: Boolean, default: false },
    refferedBy: { type: String }, // id of the user who reffered the user
    activeEqubs: { type: [String], default: [] }, // delit
    collectorOf: { type: String, default: null }, // string or null, id of the manager under whom collecting
    managerMembers: { type: [String], default: null }, // list of ids of users of the memebers of the manager(if current user is a manager) otherwise null (user is not a manager)
    agentIdList: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

const paymentSchema = new mongoose.Schema(
  {
    from: { type: String },
    to: { type: String }, // id of a admin or manager or a collector (note: if manualy the ##client paying it will be the ###verifier but if the ###receiver-admin/collector/manager himself recieved it will be the ##reciever)
    forEqub: { type: String }, // id of an equb the payment is being made
    userId: { type: String }, // id of the user who made the payment
    agentId: { type: String }, // id of the agent which act as equb
    date: { type: Date },
    isStartDay: { type: Boolean, default: false },
    startDate: { type: Date },
    imageProof: { type: String },
    amount: { type: Number },
    status: {
      type: String,
      enum: ["received", "pending", "rejected"],
      default: "pending",
    },
    seen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const equbSchema = new mongoose.Schema(
  {
    owner: { type: String }, // id of the user who owns the equb
    payments: [{ type: String }], // ids of payments
    type: { type: String },
    name: { type: String },
    amount: { type: Number },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true }
);
const transactionSchema = new mongoose.Schema(
  {
    incomeOrPayment: { type: String, enum: ["out", "in"] }, // paying out from the asset of the company or income to the company
    reasonOfTransaction: { type: String },
    amount: { type: Number },
    phoneNumber: { type: String },
  },
  { timestamps: true }
);

const SystemInfoSchema = new mongoose.Schema({
  developer: {
    type: String,
    default: "",
  },
  termsEn: {
    type: String,
    default: "",
  },
  termsAm: {
    type: String,
    default: "",
  },
  termsOr: {
    type: String,
    default: "",
  },
  message: {
    type: String,
    default: "",
  },
});

const agentSchema = new mongoose.Schema(
  {
    dagna: {
      firstName: { type: String, required: true },
      fatherName: { type: String, required: true },
      motherName: { type: String },
      phoneNumber: { type: String, required: true },
      avatar: { type: String, required: true },
      id_front: { type: String, required: true },
      id_back: { type: String, required: true },
    },
    sebsabi: {
      firstName: { type: String, required: true },
      fatherName: { type: String, required: true },
      motherName: { type: String },
      phoneNumber: { type: String, required: true },
      avatar: { type: String, required: true },
      id_front: { type: String, required: true },
      id_back: { type: String, required: true },
    },
    tsehafi: {
      firstName: { type: String, required: true },
      fatherName: { type: String, required: true },
      motherName: { type: String },
      phoneNumber: { type: String, required: true },
      avatar: { type: String, required: true },
      id_front: { type: String, required: true },
      id_back: { type: String, required: true },
    },
    description: { type: String, required: true },
    equbName: { type: String, required: true },
    banks: [
      {
        bankName: { type: String, required: true },
        accountNumber: { type: String, required: true },
      },
    ],
    equbAmount: { type: Number, required: true },
    equbType: {
      type: String,
      enum: ["monthly", "weekly", "daily"],
      required: true,
    },
    agentStatus: {
      type: String,
      enum: ["active", "passive", "frozen"],
      default: "passive",
    },
  },
  { timestamps: true }
);

const etaSchema = new mongoose.Schema(
  {
    etaName: { type: String, required: true },
    etaDescription: { type: String },
    etaAvatar: { type: String },
    etaAmount: { type: Number },

    subscribersList: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        paymentImageLink: { type: String },
      },
    ],
  },
  { timestamps: true }
);

const liveStreamSchema = new mongoose.Schema(
  {
    liveReasonFor: {
      type: String,
      enum: ["eta", "equb"],
      default: "equb",
    },
    liveCreatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Replace "User" with the actual collection name if different
    },
    liveLink: {
      type: String,
    },
    name: {
      type: String,
    },
    avatar: {
      type: String,
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ["live", "scheduled", "ended"],
      default: "scheduled",
    },
  },
  { timestamps: true } // Automatically adds createdAt and updatedAt fields
);
// src/models/Image.js

// Create model
export const LiveStream =
  mongoose.models?.LiveStream || mongoose.model("LiveStream", liveStreamSchema);

// Create model
export const Eta = mongoose.models?.Eta || mongoose.model("Eta", etaSchema);

// Create model
export const SystemInfo =
  mongoose.models?.SystemInfo || mongoose.model("SystemInfo", SystemInfoSchema);

export const User = mongoose.models?.User || mongoose.model("User", userSchema);
export const Payment =
  mongoose.models?.Payment || mongoose.model("Payment", paymentSchema);
export const Equb = mongoose.models?.Equb || mongoose.model("Equb", equbSchema);
export const Transaction =
  mongoose.models?.Transaction ||
  mongoose.model("Transaction", transactionSchema, "transactions");
export const Agent =
  mongoose.models?.Agent || mongoose.model("Agent", agentSchema);
