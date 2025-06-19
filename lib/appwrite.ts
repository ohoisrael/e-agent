import {
  Client,
  Account,
  ID,
  Databases,
  OAuthProvider,
  Avatars,
  Query,
  Storage,
  Functions,
} from "react-native-appwrite";
import * as Linking from "expo-linking";
import { openAuthSessionAsync } from "expo-web-browser";
import * as FileSystem from "expo-file-system";
import { Alert } from "react-native";

export const config = {
  platform: "com.eagent",
  endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
  projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  databaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
  galleriesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_GALLERIES_COLLECTION_ID,
  reviewsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID,
  agentsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_AGENTS_COLLECTION_ID,
  propertiesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID,
  bookingsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_BOOKINGS_COLLECTION_ID,
  paymentsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PAYMENTS_COLLECTION_ID,
  usersCollectionId: process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
  bucketId: process.env.EXPO_PUBLIC_APPWRITE_BUCKET_ID,
};

export const client = new Client();
client
  .setEndpoint(config.endpoint!)
  .setProject(config.projectId!)
  .setPlatform(config.platform!);

export const avatar = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

export async function createUserDocument(user: { $id: string; name: string; email?: string; phone?: string }) {
  try {
    const existingUser = await databases.getDocument(
      config.databaseId!,
      config.usersCollectionId!,
      user.$id
    ).catch(() => null);
    if (!existingUser) {
      await databases.createDocument(
        config.databaseId!,
        config.usersCollectionId!,
        user.$id,
        {
          name: user.name,
          email: user.email || null,
          phone: user.phone || null,
          role: "renter",
        }
      );
    }
  } catch (error) {
    console.error("Failed to create user document:", error);
    throw error;
  }
}

export async function updateUserName(userId: string, name: string) {
  try {
    await databases.updateDocument(
      config.databaseId!,
      config.usersCollectionId!,
      userId,
      { name }
    );
    await account.updateName(name);
    return true;
  } catch (error) {
    console.error("Failed to update user name:", error);
    throw error;
  }
}

export async function makeUserAdmin(userId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Only admins can assign admin roles");
    }

    await databases.updateDocument(
      config.databaseId!,
      config.usersCollectionId!,
      userId,
      { role: "admin" }
    );
    return true;
  } catch (error) {
    console.error("Failed to make user admin:", error);
    throw error;
  }
}

export async function login() {
  try {
    const redirectUri = Linking.createURL("/");

    const response = await account.createOAuth2Token(
      OAuthProvider.Google,
      redirectUri
    );
    if (!response) throw new Error("Create OAuth2 token failed");

    const browserResult = await openAuthSessionAsync(
      response.toString(),
      redirectUri
    );
    if (browserResult.type !== "success")
      throw new Error("Create OAuth2 token failed");

    const url = new URL(browserResult.url);
    const secret = url.searchParams.get("secret")?.toString();
    const userId = url.searchParams.get("userId")?.toString();
    if (!secret || !userId) throw new Error("Create OAuth2 token failed");

    const session = await account.createSession(userId, secret);
    if (!session) throw new Error("Failed to create session");

    const user = await account.get();
    await createUserDocument({
      $id: user.$id,
      name: user.name,
      email: user.email,
    });

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function loginWithPhone(phone: string) {
  try {
    const token = await account.createPhoneToken(ID.unique(), phone);
    return token;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function verifyPhoneToken(userId: string, secret: string) {
  try {
    await account.createSession(userId, secret);
    const user = await account.get();
    await createUserDocument({
      $id: user.$id,
      name: user.name || "User",
      phone: user.phone,
    });
    if (user.name === "User") {
      // Trigger name update flow immediately
      const newName = await new Promise((resolve) => {
        Alert.prompt(
          "Update Name",
          "Please enter your name",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "OK",
              onPress: (name) => resolve(name || "User"),
            },
          ],
          "plain-text"
        );
      });
      if (newName && newName !== "User") {
        await updateUserName(user.$id, newName);
      }
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function logout() {
  try {
    await account.deleteSession("current");
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function getCurrentUser() {
  try {
    const result = await account.get();
    if (!result || !result.$id) {
      console.log("No user session found");
      return null;
    }
    const userAvatar = avatar.getInitials(result.name);
    const userDoc = await databases.getDocument(
      config.databaseId!,
      config.usersCollectionId!,
      result.$id
    );
    return {
      ...result,
      avatar: userAvatar.toString(),
      role: userDoc.role || "renter",
    };
  } catch (error) {
    // Suppress error logging since this is expected after logout
    return null;
  }
}

export async function getJwt() {
  try {
    const jwt = await account.createJWT();
    return jwt.jwt;
  } catch (error) {
    console.error("Failed to create JWT:", error);
    throw new Error("Authentication failed");
  }
}

export async function uploadImage(file: { uri: string; name: string; type: string }) {
  try {
    console.log("Uploading file:", file);

    const fileInfo = await FileSystem.getInfoAsync(file.uri);
    console.log("File info:", fileInfo);
    if (!fileInfo.exists || fileInfo.isDirectory) {
      throw new Error("File does not exist or is a directory");
    }

    const extension = file.uri.split(".").pop()?.toLowerCase();
    const mimeType = extension === "png" ? "image/png" : "image/jpeg";
    const fileName = extension === "png" ? file.name.replace(/\.jpg$/, ".png") : file.name;

    const formData = new FormData();
    formData.append("fileId", ID.unique());
    formData.append("file", {
      uri: file.uri,
      name: fileName,
      type: mimeType,
    } as any);

    const response = await fetch(
      `${config.endpoint}/storage/buckets/${config.bucketId}/files`,
      {
        method: "POST",
        headers: {
          "X-Appwrite-Project": config.projectId!,
          "X-Appwrite-JWT": await getJwt(),
        },
        body: formData,
      }
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(`Upload failed: ${result.message || "Unknown error"}`);
    }

    const fileUrl = `${config.endpoint}/storage/buckets/${config.bucketId}/files/${result.$id}/view?project=${config.projectId}`;
    console.log("Uploaded file URL:", fileUrl);
    return { fileId: result.$id, fileUrl };
  } catch (error) {
    console.error("Image upload failed:", error);
    throw error;
  }
}

export async function getPropertyTypes() {
  try {
    console.log("Fetching property types...");
    console.log("Database ID:", config.databaseId);
    console.log("Collection ID:", config.propertiesCollectionId);
    const result = await databases.listDocuments(
      config.databaseId!,
      config.propertiesCollectionId!,
      [Query.limit(100)]
    );
    console.log("Total documents fetched:", result.total);
    console.log("Documents:", JSON.stringify(result.documents, null, 2));
    const uniqueTypes = Array.from(
      new Set(result.documents.map((doc) => doc.type))
    ).filter((type) => type && type !== "");
    console.log("Unique types extracted:", uniqueTypes);
    if (uniqueTypes.length === 0) {
      console.warn("No types found in documents. Using schema-defined enums.");
      return ["House", "SingleRoom", "Apartment", "Chamber/Hall"];
    }
    return uniqueTypes;
  } catch (error) {
    console.error("Failed to fetch property types:", error);
    return ["House", "SingleRoom", "Apartment", "Chamber/Hall"];
  }
}

export async function getFacilities() {
  try {
    console.log("Fetching facilities from propertiesCollection...");
    const result = await databases.listDocuments(
      config.databaseId!,
      config.propertiesCollectionId!,
      [Query.limit(100)]
    );
    console.log("Documents fetched:", result.documents);
    const allFacilities = result.documents
      .flatMap((doc) => doc.facilities || [])
      .filter((facility) => facility && facility !== "");
    const uniqueFacilities = Array.from(new Set(allFacilities));
    console.log("Unique facilities from documents:", uniqueFacilities);
    if (uniqueFacilities.length === 0) {
      console.warn("No facilities found in documents. Using default values.");
      return ["Wifi", "Parking", "Pool"];
    }
    return uniqueFacilities;
  } catch (error) {
    console.error("Failed to fetch facilities:", error);
    return ["Wifi", "Parking", "Pool"];
  }
}

export async function createProperty(data: {
  name: string;
  type: string;
  price: number;
  image: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  description: string;
  facilities: string[];
  geolocation: string;
  status: string;
  phone?: string;
}, refetchCallback?: () => void) { // Add optional refetch callback
  try {
    const property = await databases.createDocument(
      config.databaseId!,
      config.propertiesCollectionId!,
      ID.unique(),
      {
        name: data.name,
        type: data.type,
        price: data.price,
        image: data.image,
        address: data.address,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        area: data.area,
        description: data.description,
        facilities: data.facilities,
        geolocation: data.geolocation,
        status: data.status,
        rating: 0,
        reviews: [],
        gallery: [],
        phone: data.phone || null,
      }
    );
    if (refetchCallback) refetchCallback(); // Trigger refetch after creation
    return property;
  } catch (error: any) {
    console.error("Create property failed:", error);
    if (error.code === 400 && error.message.includes("Unknown attribute")) {
      throw new Error(`Invalid document structure: ${error.message}. Please ensure all attributes are defined in the properties collection.`);
    }
    throw error;
  }
}

export async function updateProperty(id: string, data: {
  name: string;
  type: string;
  price: number;
  image: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  description: string;
  facilities: string[];
  geolocation: string;
  status: string;
  phone?: string;
}) {
  try {
    const property = await databases.updateDocument(
      config.databaseId!,
      config.propertiesCollectionId!,
      id,
      {
        name: data.name,
        type: data.type,
        price: data.price,
        image: data.image,
        address: data.address,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        area: data.area,
        description: data.description,
        facilities: data.facilities,
        geolocation: data.geolocation,
        status: data.status,
        phone: data.phone || null,
      }
    );
    return property;
  } catch (error: any) {
    console.error("Update property failed:", error);
    throw error;
  }
}

export async function getLatestProperties() {
  try {
    const result = await databases.listDocuments(
      config.databaseId!,
      config.propertiesCollectionId!,
      [Query.orderAsc("$createdAt"), Query.limit(5), Query.equal("status", "available")]
    );
    return result.documents;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getProperties({
  filter,
  query,
  limit,
}: {
  filter: string;
  query: string;
  limit?: number;
}) {
  try {
    const buildQuery = [Query.orderDesc("$createdAt"), Query.equal("status", "available")];

    if (filter && filter !== "All")
      buildQuery.push(Query.equal("type", filter));

    if (query)
      buildQuery.push(
        Query.or([
          Query.search("name", query),
          Query.search("address", query),
          Query.search("type", query),
        ])
      );

    if (limit) buildQuery.push(Query.limit(limit));

    const result = await databases.listDocuments(
      config.databaseId!,
      config.propertiesCollectionId!,
      buildQuery
    );
    return result.documents;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function getPropertyById({ id }: { id: string }) {
  try {
    const result = await databases.getDocument(
      config.databaseId!,
      config.propertiesCollectionId!,
      id
    );
    return result;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function createBooking(data: {
  userId: string;
  propertyId: string;
  status: string;
}) {
  try {
    const booking = await databases.createDocument(
      config.databaseId!,
      config.bookingsCollectionId!,
      ID.unique(),
      { ...data, createdAt: new Date().toISOString() }
    );
    return booking;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function getBookings({ userId }: { userId?: string }) {
  try {
    const buildQuery = [Query.orderDesc("$createdAt")];
    if (userId && typeof userId === "string" && userId.trim() !== "") {
      console.log("Fetching bookings for userId:", userId);
      buildQuery.push(Query.equal("userId", userId));
    } else {
      console.log("Fetching all bookings for admin view");
    }
    const result = await databases.listDocuments(
      config.databaseId!,
      config.bookingsCollectionId!,
      buildQuery
    );
    console.log("Bookings fetched:", result.documents);
    return result.documents;
  } catch (error) {
    console.error("Failed to fetch bookings:", error);
    return [];
  }
}

export async function createPayment(data: {
  userId: string;
  propertyId: string;
  amount: number;
  paystackRef: string;
  status: string;
}) {
  try {
    const payment = await databases.createDocument(
      config.databaseId!,
      config.paymentsCollectionId!,
      ID.unique(),
      { ...data, createdAt: new Date().toISOString() }
    );
    return payment;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function getPayments({ userId }: { userId?: string }) {
  try {
    const buildQuery = [Query.orderDesc("$createdAt")];
    if (userId && typeof userId === "string" && userId.trim() !== "") {
      console.log("Fetching payments for userId:", userId);
      buildQuery.push(Query.equal("userId", userId));
    } else {
      console.log("Fetching all payments for admin view");
    }
    const result = await databases.listDocuments(
      config.databaseId!,
      config.paymentsCollectionId!,
      buildQuery
    );
    console.log("Payments fetched:", result.documents);
    return result.documents;
  } catch (error) {
    console.error("Failed to fetch payments:", error);
    return [];
  }
}

export async function updatePropertyStatus(propertyId: string, status: string) {
  try {
    await databases.updateDocument(
      config.databaseId!,
      config.propertiesCollectionId!,
      propertyId,
      { status }
    );
  } catch (error) {
    console.error(error);
    throw error;
  }
}