import { SafeAreaView, ScrollView, Text, View, TouchableOpacity, Image } from "react-native";
import { useAppwrite } from "@/lib/useAppwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { router } from "expo-router";
import icons from "@/constants/icons";
import { getPayments } from "@/lib/appwrite";

const Payments = () => {
  const { user } = useGlobalContext();
  const { data: payments, isLoading } = useAppwrite({
    fn: getPayments,
    params: { userId: user?.$id || user?._id },
  });

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <Text className="text-gray-500">Loading payments...</Text>
      </SafeAreaView>
    );
  }

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
        <Text className="flex-1 text-xl font-bold text-center">My Payments</Text>
        <View className="w-6" />
      </View>

      <ScrollView className="px-4 mt-4">
        {payments?.length > 0 ? (
          payments.map((payment) => (
            <View key={payment._id || payment.$id} className="mb-4 p-4 border border-gray-200 rounded-lg">
              {payment.propertyId?.name ? (
                <Text className="text-lg font-semibold">{payment.propertyId.name}</Text>
              ) : (
                <Text className="text-lg font-semibold">Property</Text>
              )}
              <Text className="text-gray-500 mt-1">
                Paid on: {new Date(payment.createdAt).toLocaleDateString()}
              </Text>
              <Text className="text-gray-500 mt-1">Amount: ₵{payment.amount}</Text>
            </View>
          ))
        ) : (
          <View className="mt-8">
            <Text className="text-gray-500 text-center">No payments found</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Payments;