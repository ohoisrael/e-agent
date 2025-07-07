import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Image,
} from "react-native";
import { useAppwrite } from "@/lib/useAppwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { router } from "expo-router";
import icons from "@/constants/icons";
import { getPayments } from "@/lib/appwrite";

const AdminPayments = () => {
  const { user } = useGlobalContext();
  const { data: payments } = useAppwrite({
    fn: getPayments,
    params: {},
  });

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-4 pt-4">
        <TouchableOpacity onPress={() => router.push("/profile")}>
          <Image
            source={icons.backArrow}
            className="w-6 h-6"
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-bold text-center">
          All Payments ({payments?.length || 0})
        </Text>
        <View className="w-6" /> {/* Spacer for alignment */}
      </View>

      <ScrollView className="px-4 mt-4">
        {payments?.length > 0 ? (
          payments.map((payment) => (
            <View
              key={payment._id || payment.$id}
              className="mb-4 p-4 border border-gray-200 rounded-lg"
            >
              <Text className="text-lg font-semibold">
                {payment.propertyId?.name || "Unknown Property"}
              </Text>
              <Text className="text-gray-500 mt-1">
                User: {payment.userId?.name || "Unknown User"}
              </Text>
              <Text className="text-gray-500 mt-1">
                Date: {new Date(payment.createdAt).toLocaleDateString()}
              </Text>
              <Text className="text-gray-500 mt-1">
                Amount: ₵{payment.amount}
              </Text>
            </View>
          ))
        ) : (
          <Text className="text-gray-500 text-center mt-8">
            No payments found
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminPayments;
