import { Client, ID, Databases, Query } from "react-native-appwrite";
import io from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { useGlobalContext } from "./global-provider";

export const config = {
  endpoint: "http://172.20.10.2:5000/api",
  socketEndpoint: "http://172.20.10.2:5000",
  databaseId: "propertyApp",
  propertiesCollectionId: "properties",
  bookingsCollectionId: "bookings",
  paymentsCollectionId: "payments",
};

const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject("propertyApp");
const databases = new Databases(client);
const socket = io(config.socketEndpoint, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export async function getCurrentUser() {
  const token = await AsyncStorage.getItem("token");
  if (!token) return null;
  try {
    const response = await fetch(`${config.endpoint}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const user = await response.json();
    return user;
  } catch (error) {
    console.error("Failed to fetch current user:", error);
    return null;
  }
}

export async function login({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  try {
    const response = await fetch(`${config.endpoint}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok && data.token) {
      await AsyncStorage.setItem("token", data.token);
      return true;
    } else {
      throw new Error(data.message || "Login failed");
    }
  } catch (error) {
    console.error("Login failed:", error);
    throw error;
  }
}

export async function loginWithPhone(phone: string) {
  try {
    const response = await fetch(`${config.endpoint}/auth/login/phone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await response.json();
    if (response.ok && data.userId && data.token) {
      await AsyncStorage.setItem("token", data.token);
      return { userId: data.userId, token: data.token };
    }
    return null;
  } catch (error) {
    console.error("Phone login failed:", error);
    throw error;
  }
}

export async function register({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name: string;
}) {
  try {
    const response = await fetch(`${config.endpoint}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await response.json();
    if (response.ok && data.token) {
      await AsyncStorage.setItem("token", data.token);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Register failed:", error);
    throw error;
  }
}

export async function registerWithPhone({
  phone,
  name,
}: {
  phone: string;
  name: string;
}) {
  try {
    const response = await fetch(`${config.endpoint}/auth/register/phone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, name }),
    });
    const data = await response.json();
    if (response.ok && data.userId && data.token) {
      await AsyncStorage.setItem("token", data.token);
      return { userId: data.userId, token: data.token };
    }
    return null;
  } catch (error) {
    console.error("Phone register failed:", error);
    throw error;
  }
}

export async function verifyPhoneToken(userId: string, otp: string) {
  try {
    const response = await fetch(`${config.endpoint}/auth/verify-phone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, otp }),
    });
    const data = await response.json();
    return response.ok && data.token;
  } catch (error) {
    console.error("OTP verification failed:", error);
    throw error;
  }
}

export async function getLatestProperties() {
  try {
    const response = await fetch(`${config.endpoint}/property/latest`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const properties = await response.json();
    return properties;
  } catch (error) {
    console.error("Failed to fetch latest properties:", error);
    return [];
  }
}

export async function getPendingProperties() {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error("No authentication token found");
    const response = await fetch(`${config.endpoint}/property/pending`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const properties = await response.json();
    return properties;
  } catch (error) {
    console.error("Failed to fetch pending properties:", error);
    return [];
  }
}

export async function approveProperty(propertyId: string, approvalStatus: 'approved' | 'rejected') {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error("No authentication token found");
    const response = await fetch(`${config.endpoint}/property/${propertyId}/approve`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ approvalStatus }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Failed to approve/reject property:", error);
    throw error;
  }
}

export async function getProperties({
  filter,
  query,
  limit,
}: {
  filter?: string;
  query?: string;
  limit?: number;
}) {
  try {
    const url = new URL(`${config.endpoint}/property`);
    url.searchParams.append("filter", filter || "All");
    url.searchParams.append("limit", (limit || 6).toString());
    if (query && query.trim()) {
      url.searchParams.append("query", query.trim());
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const properties = await response.json();
    return properties;
  } catch (error) {
    console.error("Failed to fetch properties:", error);
    return [];
  }
}

export async function getPropertyById({ id }: { id: string }) {
  try {
    if (!id) {
      console.error("getPropertyById - Invalid property ID:", id);
      return null;
    }
    const response = await fetch(`${config.endpoint}/property/${id}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const property = await response.json();
    return property;
  } catch (error) {
    console.error("Failed to fetch property:", error);
    return null;
  }
}

export async function createProperty(
  data: any,
  triggerPropertyRefresh: () => void
) {
  try {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      if (key === "images") {
        data.images.forEach((image: any, index: number) => {
          formData.append("images", {
            uri: image.uri,
            type: image.type,
            name: image.name || `image${index}.${image.uri.split(".").pop()}`,
          } as any);
        });
      } else if (key === "facilities") {
        formData.append(key, JSON.stringify(data[key]));
      } else {
        formData.append(key, data[key]);
      }
    });
    const token = await AsyncStorage.getItem("token");
    const response = await fetch(`${config.endpoint}/property/add`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    triggerPropertyRefresh();
    return result;
  } catch (error) {
    console.error("createProperty: Failed to create property:", error);
    throw error;
  }
}

export async function updateProperty(propertyId: string, data: any) {
  try {
    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      if (key === "images") {
        data.images.forEach((image: any, index: number) => {
          formData.append(`images`, {
            uri: image.uri,
            type: image.type,
            name: `image${index}.jpg`,
          });
        });
      } else if (key === "facilities") {
        formData.append(key, JSON.stringify(data[key]));
      } else {
        formData.append(key, data[key]);
      }
    });
    const token = await AsyncStorage.getItem("token");
    const response = await fetch(`${config.endpoint}/property/${propertyId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Update property failed:", error);
    throw error;
  }
}

export async function createBooking({
  userId,
  propertyId,
  status,
}: {
  userId: string;
  propertyId: string;
  status: string;
}) {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error("No authentication token found");
    router.push("/sign-in");
    const response = await fetch(`${config.endpoint}/booking`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, propertyId, status }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Failed to create booking:", error);
    throw error;
  }
}

export async function getBookings({ userId }: { userId?: string }) {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error("No authentication token found");

    const user = await getCurrentUser();
    if (!user) throw new Error("User not found");

    const effectiveUserId = userId || user._id || user.$id;
    const endpoint =
      user?.role === "admin" && !userId
        ? "/booking/admin"
        : `/booking/user/${effectiveUserId}`;

    const response = await fetch(`${config.endpoint}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorText}`
      );
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    return [];
  }
}

export async function getPayments({ userId }: { userId?: string }) {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error("No authentication token found");
    const user = await getCurrentUser();
    const endpoint =
      user?.role === "admin"
        ? "/payment/admin"
        : userId
        ? `/payment/user/${userId}`
        : `/payment/user/${user?._id || user?.$id}`;
    const response = await fetch(`${config.endpoint}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorText}`
      );
    }
    const payments = await response.json();
    return payments;
  } catch (error) {
    console.error("Failed to fetch payments:", error);
    return [];
  }
}

export async function createPayment(data: {
  userId: string;
  propertyId: string;
  amount: number;
  paystackRef?: string;
  status?: string;
}) {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error("No authentication token found");
    router.push("/sign-in");
    const response = await fetch(`${config.endpoint}/payment/initialize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ...data, amount: Math.round(data.amount) }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorText}`
      );
    }
    const result = await response.json();
    if (result.authorization_url) {
      const redirectResult = await WebBrowser.openAuthSessionAsync(
        result.authorization_url,
        `${config.endpoint}/payment/verify/${result.reference}`
      );
      if (redirectResult.type === "success") {
        const verification = await verifyPayment(result.reference);
        return verification;
      } else if (redirectResult.type === "cancel") {
        const verification = await verifyPayment(result.reference);
        return verification;
      } else {
        throw new Error("Redirect process interrupted");
      }
    }
    return result;
  } catch (error) {
    console.error("Failed to create payment:", error);
    throw error;
  }
}

export async function verifyPayment(reference: string) {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error("No authentication token found");
    const response = await fetch(
      `${config.endpoint}/payment/verify/${reference}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorText}`
      );
    }
    const result = await response.json();
    if (result.status === "success") {
      await updatePropertyStatus(result.payment.propertyId, "booked");
    }
    return result;
  } catch (error) {
    console.error("Failed to verify payment:", error);
    throw error;
  }
}

export async function updatePropertyStatus(propertyId: string, status: string) {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error("No authentication token found");
    const response = await fetch(
      `${config.endpoint}/property/${propertyId}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Failed to update property status:", error);
    throw error;
  }
}

export async function logout() {
  try {
    await AsyncStorage.removeItem("token");
    return true;
  } catch (error) {
    console.error("Logout failed:", error);
    return false;
  }
}

export function useChatSocket() {
  return socket;
}

export async function startChat({
  userId,
  adminId,
  userName,
}: {
  userId: string;
  adminId: string;
  userName: string;
}) {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error("No authentication token found");
    const response = await fetch(`${config.endpoint}/chat/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, adminId, userName: userName || "User" }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Failed to start chat:", error);
    throw error;
  }
}

export async function sendMessage({
  chatId,
  content,
  senderName,
}: {
  chatId: string;
  content: string;
  senderName: string;
}) {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error("No authentication token found");
    const response = await fetch(`${config.endpoint}/chat/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        chatId,
        content,
        senderName: senderName || "User",
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Failed to send message:", error);
    throw error;
  }
}

export async function getMessages(chatId: string) {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error("No authentication token found");
    const response = await fetch(`${config.endpoint}/chat/${chatId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const chat = await response.json();
    return chat;
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    throw error;
  }
}

export async function getAdminChats() {
  try {
    const token = await AsyncStorage.getItem("token");
    if (!token) throw new Error("No authentication token found");
    const response = await fetch(`${config.endpoint}/chat/admin/chats`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const chats = await response.json();
    return chats;
  } catch (error) {
    console.error("Failed to fetch admin chats:", error);
    throw error;
  }
}

export async function registerAdmin({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name: string;
}) {
  try {
    const response = await fetch(`${config.endpoint}/auth/register/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await response.json();
    if (response.ok && data.token) {
      await AsyncStorage.setItem("token", data.token);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Admin register failed:", error);
    throw error;
  }
}

export async function registerAdminWithPhone({
  phone,
  name,
}: {
  phone: string;
  name: string;
}) {
  try {
    const response = await fetch(`${config.endpoint}/auth/register/phone/admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, name }),
    });
    const data = await response.json();
    if (response.ok && data.userId && data.token) {
      await AsyncStorage.setItem("token", data.token);
      return { userId: data.userId, token: data.token };
    }
    return null;
  } catch (error) {
    console.error("Admin phone register failed:", error);
    throw error;
  }
}