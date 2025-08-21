import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from "react-native";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useGlobalContext } from "@/lib/global-provider";
import {
  useChatSocket,
  startChat,
  sendMessage,
  getAdminChats,
  getMessages,
} from "@/lib/appwrite";
import { router } from "expo-router";
import icons from "@/constants/icons";

interface Message {
  _id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  chatId?: string;
}

interface Chat {
  _id: string;
  userId: string;
  userName: string;
  messages: Message[];
}

const ChatScreen = ({ chatId: propChatId }: { chatId?: string }) => {
  const { user } = useGlobalContext();
  const socket = useChatSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(!!propChatId);
  const [activeChatId, setActiveChatId] = useState<string | undefined>(
    propChatId
  );
  const [adminChats, setAdminChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const previousChatIdRef = useRef<string | undefined>(undefined);
  const initializedRef = useRef(false);
  const lastAdminChatsRef = useRef<Chat[]>([]);
  const lastMessageIdRef = useRef<string | null>(null);
  const lastActiveChatIdRef = useRef<string | undefined>(undefined);

  const initializeChat = useCallback(async () => {
    if (!user || !user._id || activeChatId || initializedRef.current) return;

    if (!user.name) {
      Alert.alert(
        "Error",
        "Your profile is missing a name. Please update your profile to start a chat.",
        [{ text: "OK", onPress: () => router.push("/profile") }]
      );
      return;
    }

    try {
      setLoading(true);
      initializedRef.current = true;
      const response = await startChat({
        userId: user._id,
        adminId: "admin",
        userName: user.name,
      });
      const chatIdFromResponse = response.chatId;
      if (
        chatIdFromResponse &&
        chatIdFromResponse !== lastActiveChatIdRef.current
      ) {
        setActiveChatId(chatIdFromResponse);
        lastActiveChatIdRef.current = chatIdFromResponse;
        socket.emit("joinChat", {
          userId: user._id,
          adminId: "admin",
          chatId: chatIdFromResponse,
          userName: user.name,
        });
        fetchMessages(chatIdFromResponse);
      }
    } catch (error) {
      console.error("Chat initialization error:", error);
      Alert.alert("Error", "Failed to start chat. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user, socket, activeChatId, fetchMessages]);

  const fetchAdminChats = useCallback(async () => {
    if (user?.role !== "admin") return;
    try {
      const chats = await getAdminChats();
      const filteredChats = chats.filter(
        (chat: Chat) => chat.userId !== user._id && chat.userName !== "Admin"
      );
      if (
        JSON.stringify(filteredChats) !==
        JSON.stringify(lastAdminChatsRef.current)
      ) {
        setAdminChats(filteredChats);
        lastAdminChatsRef.current = filteredChats;
        if (
          filteredChats.length > 0 &&
          !activeChatId &&
          filteredChats[0]._id !== lastActiveChatIdRef.current
        ) {
          setSelectedChat(filteredChats[0]);
          setActiveChatId(filteredChats[0]._id);
          lastActiveChatIdRef.current = filteredChats[0]._id;
          socket.emit("joinChat", {
            userId: user._id,
            adminId: "admin",
            chatId: filteredChats[0]._id,
            userName: filteredChats[0].userName,
          });
          fetchMessages(filteredChats[0]._id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch admin chats:", error);
      Alert.alert("Error", "Failed to load admin chats.");
    }
  }, [user, socket, fetchMessages]);

  const fetchMessages = useCallback(async (chatId: string) => {
    if (!chatId || chatId === previousChatIdRef.current) return;
    try {
      setLoading(true);
      const chat = await getMessages(chatId);
      const sortedMessages = (chat.messages || []).sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setMessages(sortedMessages);
      previousChatIdRef.current = chatId;
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      Alert.alert("Error", "Failed to load messages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !user._id) {
      Alert.alert("Error", "Please log in to continue.");
      router.push("/sign-in");
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchAdminChats();
    }
  }, [user, fetchAdminChats]);

  useEffect(() => {
    if (!user || !user._id) return;
    if (user.role !== "admin" && !propChatId && !activeChatId) {
      initializeChat();
    }
  }, [user, propChatId, activeChatId, socket, initializeChat]);

  useEffect(() => {
    if (!user || !user._id || !activeChatId) return;
    if (activeChatId !== previousChatIdRef.current) {
      socket.emit("joinChat", {
        userId: user._id,
        adminId: "admin",
        chatId: activeChatId,
        userName: user.name || "User",
      });
      fetchMessages(activeChatId);
    }
  }, [user, activeChatId, socket, fetchMessages]);

  useEffect(() => {
    const handleChatHistory = (history: {
      messages: Message[];
      chatId: string;
    }) => {
      if (history.chatId !== activeChatId) return;
      const sortedMessages = (history.messages || []).sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      setMessages(sortedMessages);
    };

    const handleNewMessage = (newMessage: Message) => {
      if (
        newMessage._id === lastMessageIdRef.current ||
        newMessage.chatId !== activeChatId
      )
        return;
      lastMessageIdRef.current = newMessage._id;
      setMessages((prev) => {
        const updated = [
          ...prev.filter((msg) => msg._id !== `temp-${newMessage._id}`),
          newMessage,
        ].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        return updated;
      });
    };

    const handleNotification = (data: { chatId: string; senderId: string }) => {
      if (data.chatId !== activeChatId && user) {
        Alert.alert(
          "New Message",
          `New message from ${data.senderId === user._id ? "Admin" : "User"}`
        );
      }
    };

    socket.on("chatHistory", handleChatHistory);
    socket.on("newMessage", handleNewMessage);
    socket.on("newMessageNotification", handleNotification);

    return () => {
      socket.off("chatHistory", handleChatHistory);
      socket.off("newMessage", handleNewMessage);
      socket.off("newMessageNotification", handleNotification);
    };
  }, [socket, activeChatId, user]);

  const handleSend = useCallback(async () => {
    if (!message.trim() || !activeChatId) return;

    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    const newMessage = {
      _id: tempId,
      senderId: user._id,
      senderName: user.name || "User",
      content: message,
      timestamp: new Date().toISOString(),
      chatId: activeChatId,
    };
    setMessages((prev) =>
      [...prev, newMessage].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
    );
    try {
      await sendMessage({
        chatId: activeChatId,
        content: message,
        senderName: user.name || "User",
      });
      setMessage("");
    } catch (error) {
      console.error("Send message error:", error);
      Alert.alert("Error", "Failed to send message.");
      setMessages((prev) => prev.filter((msg) => msg._id !== tempId));
    }
  }, [message, activeChatId, user]);

  const handleSelectChat = useCallback(
    (chat: Chat) => {
      if (chat._id === activeChatId) return;
      setSelectedChat(chat);
      setActiveChatId(chat._id);
      lastActiveChatIdRef.current = chat._id;
      socket.emit("joinChat", {
        userId: user._id,
        adminId: "admin",
        chatId: chat._id,
        userName: chat.userName,
      });
      fetchMessages(chat._id);
    },
    [user, socket, activeChatId, fetchMessages]
  );

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isUserSender = item.senderId === user._id;
      const senderName = item.senderName || (isUserSender ? "You" : "Admin");
      return (
        <View
          key={item._id || `${item.senderId}-${item.timestamp}`}
          className={`p-3 my-2 rounded-lg max-w-[70%] ${
            isUserSender ? "self-end bg-primary-300" : "self-start bg-gray-100"
          }`}
        >
          <Text
            className={`text-sm font-rubik-bold ${
              isUserSender ? "text-white" : "text-black-300"
            }`}
          >
            {senderName}
          </Text>
          <Text
            className={`text-base ${
              isUserSender ? "text-white" : "text-black-300"
            } font-rubik mt-1`}
          >
            {item.content}
          </Text>
          <Text
            className={`text-xs ${
              isUserSender ? "text-white/70" : "text-gray-500"
            } mt-1`}
          >
            {new Date(item.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      );
    },
    [user]
  );

  const renderAdminChatSelector = useMemo(
    () => (
      <View className="p-4 bg-white border-b border-gray-200">
        <Text className="text-lg font-rubik-bold text-black-300 mb-2">
          Select User Chat
        </Text>
        <FlatList
          horizontal
          data={adminChats}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            const latestMessage =
              item.messages.length > 0
                ? item.messages[item.messages.length - 1].content.slice(0, 30) +
                  (item.messages[item.messages.length - 1].content.length > 30
                    ? "..."
                    : "")
                : "No messages yet";
            return (
              <TouchableOpacity
                onPress={() => handleSelectChat(item)}
                className={`p-3 mx-1 rounded-lg w-40 ${
                  activeChatId === item._id ? "bg-primary-300" : "bg-gray-100"
                }`}
              >
                <Text
                  className={`text-sm font-rubik-bold ${
                    activeChatId === item._id ? "text-white" : "text-black-300"
                  }`}
                >
                  {item.userName || "User"}
                </Text>
                <Text
                  className={`text-xs font-rubik ${
                    activeChatId === item._id
                      ? "text-white/80"
                      : "text-gray-500"
                  } mt-1`}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {latestMessage}
                </Text>
              </TouchableOpacity>
            );
          }}
          showsHorizontalScrollIndicator={false}
        />
      </View>
    ),
    [adminChats, activeChatId, handleSelectChat]
  );

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#0061FF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <Image source={icons.backArrow} className="size-6" />
        </TouchableOpacity>
        <Text className="text-lg font-rubik-bold text-black-300">
          {user?.role === "admin"
            ? `Chat with ${selectedChat?.userName || "User"}`
            : "Chat with Landlord"}
        </Text>
        <TouchableOpacity className="p-2">
          <Image source={icons.info} className="size-6" tintColor="#666876" />
        </TouchableOpacity>
      </View>
      {user?.role === "admin" &&
        adminChats.length > 0 &&
        renderAdminChatSelector}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) =>
            item._id || `${item.senderId}-${item.timestamp}`
          }
          renderItem={renderMessage}
          inverted
          contentContainerStyle={{ padding: 10, paddingBottom: 20 }}
        />
        <View className="w-full flex-row items-center p-3 bg-white border-t border-gray-200">
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Type a message..."
            className="flex-1 p-3 border border-gray-300 rounded-lg mr-2 text-base font-rubik"
            placeholderTextColor="#666876"
          />
          <TouchableOpacity
            onPress={handleSend}
            className={`p-3 rounded-lg ${
              message.trim() ? "bg-primary-300" : "bg-gray-300"
            }`}
            disabled={!message.trim()}
          >
            <Image source={icons.send} className="size-6" tintColor="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;
