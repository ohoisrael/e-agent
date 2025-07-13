import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { useAppwrite } from "@/lib/useAppwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { router } from "expo-router";
import icons from "@/constants/icons";
import { getPayments } from "@/lib/appwrite";

const AdminPayments = () => {
  const { user } = useGlobalContext();
  const { data: payments, isLoading } = useAppwrite({
    fn: getPayments,
    params: {},
  });

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  // Transform the data if it's just an array of status strings
  const transformedPayments = Array.isArray(payments)
    ? payments.map((payment, index) => ({
        _id: `temp-id-${index}`,
        status: payment === "paid" ? "success" : "failed",
        amount: 0, // Default to 0 since amount isn't available
        createdAt: new Date().toISOString(), // Mock with current date/time
        userId: { name: "Unknown User" },
        propertyId: { name: "Unknown Property" },
      }))
    : [];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-4 pt-4">
        <TouchableOpacity onPress={() => router.back()}>
          <Image
            source={icons.backArrow}
            className="w-6 h-6"
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-bold text-center">
          All Payments ({transformedPayments.length})
        </Text>
        <View className="w-6" />
      </View>

      <ScrollView className="px-4 mt-4">
        {transformedPayments.length > 0 ? (
          transformedPayments.map((payment) => (
            <View
              key={payment._id}
              className="mb-4 p-4 border border-gray-200 rounded-lg"
            >
              <Text className="text-lg font-semibold">
                Status: {payment.status === "success" ? "Paid" : "Failed"}
              </Text>
              
              <Text className="text-gray-500 mt-1">
                Date: {new Date(payment.createdAt).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "numeric",
                  year: "numeric",
                })}
              </Text>
              
            </View>
          ))
        ) : (
          <Text className="text-gray-500 text-center mt-8">No payments found</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminPayments;