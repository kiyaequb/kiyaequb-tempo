import { Payment, User } from "@/lib/models";
import { connectToDb } from "@/lib/utils";

export const CollectorsAndManagerTodaysAmount = async ({ mngrId, day }) => {
  if (!mngrId) {
    return <div>No manager ID provided</div>;
  }

  await connectToDb();
  console.log(mngrId);

  // Find collectors based on the mngrId (exclude operators)
  const collectors = await User.find({
    underManager: mngrId,
    collectorOf: { $exists: true, $ne: null },
    $or: [
      { oprator: { $exists: false } },
      { oprator: false },
    ],
  });

  // Find operators based on the mngrId
  const operators = await User.find({
    underManager: mngrId,
    oprator: true,
  });

  const collectorIds = collectors.map((collector) => collector.id);
  const operatorIds = operators.map((operator) => operator.id);

  let today;
  let startOfDay;
  let endOfDay;
  if (day === "yesterday") {
    today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    startOfDay = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate()
    );

    endOfDay = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate() + 1
    );
  } else if (day === "bYesterday") {
    today = new Date();
    const bYesterday = new Date(today);
    bYesterday.setDate(today.getDate() - 2);
    startOfDay = new Date(
      bYesterday.getFullYear(),
      bYesterday.getMonth(),
      bYesterday.getDate()
    );
    endOfDay = new Date(
      bYesterday.getFullYear(),
      bYesterday.getMonth(),
      bYesterday.getDate() + 1
    );
  } else if (day === "b3day") {
    today = new Date();
    const bYesterday = new Date(today);
    bYesterday.setDate(today.getDate() - 3);
    startOfDay = new Date(
      bYesterday.getFullYear(),
      bYesterday.getMonth(),
      bYesterday.getDate()
    );
    endOfDay = new Date(
      bYesterday.getFullYear(),
      bYesterday.getMonth(),
      bYesterday.getDate() + 1
    );
  } else if (day === "b4day") {
    today = new Date();
    const bYesterday = new Date(today);
    bYesterday.setDate(today.getDate() - 4);
    startOfDay = new Date(
      bYesterday.getFullYear(),
      bYesterday.getMonth(),
      bYesterday.getDate()
    );
    endOfDay = new Date(
      bYesterday.getFullYear(),
      bYesterday.getMonth(),
      bYesterday.getDate() + 1
    );
  } else {
    today = new Date();
    startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );
  }

  // Query payments for the array of collector IDs (collectors only)
  const todayPaymentsCollectors = await Payment.find({
    to: { $in: collectorIds },
    $or: [
      {
        createdAt: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
        $and: [
          { isStartDay: { $ne: true } }, // Ensure isStartDay is not true
          { startDate: { $exists: false } }, // Ensure startDate does not exist
        ],
      },
      {
        startDate: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
        isStartDay: true,
      },
    ],
  });

  // Query payments for the array of operator IDs
  const todayPaymentsOperators = await Payment.find({
    to: { $in: operatorIds },
    $or: [
      {
        createdAt: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
        $and: [
          { isStartDay: { $ne: true } }, // Ensure isStartDay is not true
          { startDate: { $exists: false } }, // Ensure startDate does not exist
        ],
      },
      {
        startDate: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
        isStartDay: true,
      },
    ],
  });

  // Aggregate payments for all collectors
  let collectorsSum = 0;
  todayPaymentsCollectors.forEach((payment) => {
    collectorsSum += payment.amount;
  });

  // Aggregate payments for all operators
  let operatorsSum = 0;
  todayPaymentsOperators.forEach((payment) => {
    operatorsSum += payment.amount;
  });

  // Manager's own payments
  let managerSum = 0;
  const todayPaymentsMe = await Payment.find({
    to: mngrId,
    $or: [
      {
        createdAt: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
        $and: [
          { isStartDay: { $ne: true } }, // Ensure isStartDay is not true
          { startDate: { $exists: false } }, // Ensure startDate does not exist
        ],
      },
      {
        startDate: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
        isStartDay: true,
      },
    ],
  });
  todayPaymentsMe.forEach((payment) => {
    managerSum += payment.amount;
  });

  const totalSum = collectorsSum + managerSum + operatorsSum;

  return (
    <div>
      {collectorsSum} + {managerSum} + {operatorsSum} = {totalSum} Birr
    </div>
  );
};
