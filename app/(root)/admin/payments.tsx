import {
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { useAppwrite } from "@/lib/useAppwrite";
import { getPayments, getPropertyById } from "@/lib/appwrite";
import { useGlobalContext } from "@/lib/global-provider";
import { useState, useEffect } from "react";
import icons from "@/constants/icons";
import { router } from "expo-router";

const AdminPayments = () => {
  const { user } = useGlobalContext();
  const [properties, setProperties] = useState<any[]>([]);

  console.log("AdminPayments - Current user:", user);

  if (!user || !user.$id) {
    console.log("AdminPayments - User not logged in, redirecting to sign-in");
    router.replace("/sign-in");
    return null;
  }

  if (user?.role !== "admin") {
    console.log("AdminPayments - User is not an admin, redirecting to profile");
    router.replace("/profile");
    return null;
  }

  const { data: payments, loading } = useAppwrite({
    fn: getPayments,
    params: {}, // No userId for admin view
  });

  useEffect(() => {
    const fetchProperties = async () => {
      if (payments && payments.length > 0) {
        const propertyPromises = payments.map((payment: any) =>
          getPropertyById({ id: payment.propertyId })
        );
        const fetchedProperties = await Promise.all(propertyPromises);
        setProperties(fetchedProperties.filter((p) => p !== null));
      }
    };
    fetchProperties();
  }, [payments]);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="pb-32 px-7"
      >
        <View className="flex flex-row items-center justify-between mt-5">
          <TouchableOpacity
            onPress={() => router.replace('/profile')}
            className="flex flex-row bg-primary-200 rounded-full size-11 items-center justify-center"
          >
            <Image source={icons.backArrow} className="size-5" />
          </TouchableOpacity>
          <Text className="text-xl font-rubik-bold">All Payments</Text>
          <View className="size-11" />
        </View>
        {loading ? (
          <Text className="text-black-300 text-center mt-10">Loading...</Text>
        ) : payments && payments.length > 0 ? (
          <View className="mt-5">
            {payments.map((payment: any, index: number) => {
              const property = properties.find((p) => p.$id === payment.propertyId);
              return (
                <View
                  key={payment.$id}
                  className="border-b border-primary-200 py-4"
                >
                  <Text className="text-lg font-rubik-bold">
                    {property?.name || "Property"}
                  </Text>
                  <Text className="text-black-200">User ID: {payment.userId}</Text>
                  <Text className="text-black-200">Amount: ₵{payment.amount}</Text>
                  <Text className="text-black-200">Status: {payment.status}</Text>
                  <Text className="text-black-200">
                    Paid on: {new Date(payment.createdAt).toLocaleString()}
                  </Text>
                  <Text className="text-black-200">
                    Paystack Ref: {payment.paystackRef}
                  </Text>
                  {property && (
                    <TouchableOpacity
                      onPress={() => router.push(`/properties/${property.$id}`)}
                      className="bg-primary-300 p-2 rounded-lg mt-2 w-32"
                    >
                      <Text className="text-white text-center">View Property</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <Text className="text-black-300 text-center mt-10">
            No payments found.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminPayments;