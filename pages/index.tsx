import type { GetServerSideProps } from "next";
import { createNewChatSession } from "@/utils/chats";

export const getServerSideProps: GetServerSideProps = async () => {
  const chatId = createNewChatSession();

  return {
    redirect: {
      destination: `/c/${chatId}`,
      permanent: false,
    },
  };
};

export default function Home() {
  return null;
}
