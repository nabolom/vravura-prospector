import ProspectorApp from "./prospector-app";
import { requireChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireChatGPTUser("/");
  return <ProspectorApp user={{ displayName: user.displayName, email: user.email }} />;
}
