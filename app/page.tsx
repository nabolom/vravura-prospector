import ProspectorApp from "./prospector-app";
import { redirect } from "next/navigation";
import { getSessionUser } from "../lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <ProspectorApp user={{ displayName: user.displayName, email: user.email }} />;
}
