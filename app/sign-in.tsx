import { Alert, Image, ScrollView, Text, TouchableOpacity, View, TextInput } from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import images from "@/constants/images";
import icons from "@/constants/icons";
import { Redirect } from "expo-router";
import { useGlobalContext } from "@/lib/global-provider";
import { login, loginWithPhone, verifyPhoneToken } from "@/lib/appwrite";
import { KeyboardAvoidingView, Platform } from "react-native";

const SignIn = () => {
  const { refetch, loading, isLogged } = useGlobalContext();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneToken, setPhoneToken] = useState<{ userId: string } | null>(null);
  const [loginMethod, setLoginMethod] = useState<"google" | "phone">("google");

  if (!loading && isLogged) return <Redirect href="/" />;

  const handleGoogleLogin = async () => {
    const result = await login();
    if (result) {
      refetch();
    } else {
      Alert.alert("Error", "Failed to login with Google");
    }
  };

  const handlePhoneLogin = async () => {
    if (!phone) {
      Alert.alert("Error", "Please enter a phone number");
      return;
    }
    const fullPhoneNumber = `+233${phone.replace(/[^0-9]/g, "")}`; // Prepend +233 and remove non-digits
    try {
      const token = await loginWithPhone(fullPhoneNumber);
      setPhoneToken(token);
      Alert.alert("Success", "OTP sent to your phone");
    } catch (error) {
      Alert.alert("Error", "Failed to send OTP");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !phoneToken) {
      Alert.alert("Error", "Please enter the OTP");
      return;
    }
    try {
      const result = await verifyPhoneToken(phoneToken.userId, otp);
      if (result) {
        refetch();
      } else {
        Alert.alert("Error", "Invalid OTP");
      }
    } catch (error) {
      Alert.alert("Error", "OTP verification failed");
    }
  };

  return (
    <SafeAreaView className="bg-white flex-1">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
          <Image
            source={images.onboarding}
            className="w-full h-80"
            resizeMode="contain"
          />
          <View className="px-10">
            <Text className="text-base text-center uppercase font-rubik text-black-200">
              Welcome to E-Agent
            </Text>
            <Text className="text-3xl font-rubik-bold text-black-300 text-center mt-2">
              Let's Get You Closer to {"\n"}
              <Text className="text-primary-300">Your ideal Property</Text>
            </Text>
            <View className="flex flex-row justify-around mt-8">
              <TouchableOpacity
                onPress={() => setLoginMethod("google")}
                className={`py-2 px-4 rounded-full ${loginMethod === "google" ? "bg-primary-300" : "bg-primary-100"}`}
              >
                <Text className={`text-sm ${loginMethod === "google" ? "text-white" : "text-black-300"} font-rubik`}>
                  Google
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setLoginMethod("phone")}
                className={`py-2 px-4 rounded-full ${loginMethod === "phone" ? "bg-primary-300" : "bg-primary-100"}`}
              >
                <Text className={`text-sm ${loginMethod === "phone" ? "text-white" : "text-black-300"} font-rubik`}>
                  Phone
                </Text>
              </TouchableOpacity>
            </View>
            {loginMethod === "google" ? (
              <>
                <Text className="text-lg font-rubik text-black-200 text-center mt-12">
                  Login to E-Agent with Google
                </Text>
                <TouchableOpacity
                  onPress={handleGoogleLogin}
                  className="bg-white shadow-md shadow-zinc-300 rounded-full w-full py-5 mt-4"
                >
                  <View className="flex flex-row items-center justify-center">
                    <Image source={icons.google} className="w-5 h-5" resizeMode="contain"/>
                    <Text className="text-lg font-rubik-medium text-black-300 ml-2">Continue with Google</Text>
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text className="text-lg font-rubik text-black-200 text-center mt-12">
                  Login with Phone Number
                </Text>
                {!phoneToken ? (
                  <>
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="Enter phone number (e.g., 0201234567)"
                      className="text-sm font-rubik text-black-300 border border-primary-200 rounded-lg p-3 mt-4"
                      keyboardType="phone-pad"
                    />
                    <TouchableOpacity
                      onPress={handlePhoneLogin}
                      className="bg-primary-300 rounded-full w-full py-5 mt-4"
                    >
                      <Text className="text-white text-lg font-rubik-bold text-center">
                        Send OTP
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TextInput
                      value={otp}
                      onChangeText={setOtp}
                      placeholder="Enter OTP"
                      className="text-sm font-rubik text-black-300 border border-primary-200 rounded-lg p-3 mt-4"
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      onPress={handleVerifyOtp}
                      className="bg-primary-300 rounded-full w-full py-5 mt-4"
                    >
                      <Text className="text-white text-lg font-rubik-bold text-center">
                        Verify OTP
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SignIn;