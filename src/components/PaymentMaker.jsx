import { User, Equb, Payment} from "@/lib/models";
import { connectToDb } from "@/lib/utils";
import Link from "next/link";

export const Paymentmaker = async ({ payment }) => {
  await connectToDb();
  let user;
  let equb;

  try {
    equb = await Equb.findById(payment.forEqub);
    if (equb) {
      user = await User.findById(equb.owner);
      if (user) {
        user.firstName + " " + user.lastName;
      }
    }
    // user = await User.findById(payment.to);
  } catch {
    console.log("err format of 'payment.to'");
  }

  console.log(user);

  return (
    <div>
      {user ? (
        <>
          <Link href={`/admin/users/${user?.id}`}>
            <h3>{user && user?.firstName + " " + user?.lastName}</h3>
            <h3>{!user && "Owner"}</h3>
          </Link>
        </>
      ) : (
        <>
          <h3>{user && user?.firstName + " " + user?.lastName}</h3>
          <h3>{!user && "Owner"}</h3>
        </>
      )}
    </div>
  );
};
