type Props = {
  params: { chatId: string };
};

export default function ChatPage({ params }: Props) {
  return (
    <div>
      <h1>Chat: {params.chatId}</h1>
    </div>
  );
}
