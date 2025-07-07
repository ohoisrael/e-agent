import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  TextInput,
} from "react-native";
import React, { useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import images from "@/constants/images";
import icons from "@/constants/icons";
import { useRouter } from "expo-router";
import { useGlobalContext } from "@/lib/global-provider";
import {
  login,
  loginWithPhone,
  verifyPhoneToken,
  register,
  registerWithPhone,
} from "@/lib/appwrite";
import {
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";

const SignIn = () => {
  const { refetchUser, loading, isLogged } = useGlobalContext();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneToken, setPhoneToken] = useState<{
    userId: string;
    token: string;
  } | null>(null);
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [isRegister, setIsRegister] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  console.log("SignIn - Loading:", loading, "IsLogged:", isLogged);

  useEffect(() => {
    if (!loading && isLogged) {
      router.replace("/(tabs)");
    }
  }, [loading, isLogged, router]);

  const handleEmailAction = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }
    setLocalLoading(true);
    try {
      if (isRegister) {
        const result = await register({ email, password, name });
        if (result) {
          await refetchUser();
          Alert.alert("Success", "Registration successful");
          setIsRegister(false);
        } else {
          Alert.alert("Error", "Registration failed. Please try again.");
        }
      } else {
        const result = await login({ email, password });
        if (result) {
          await refetchUser();
          router.replace("/(tabs)");
        } else {
          Alert.alert(
            "Error",
            "Invalid email or password. Please check your credentials."
          );
        }
      }
    } catch (error: any) {
      Alert.alert(
        "Login Failed",
        error.message || "An error occurred. Please try again."
      );
    } finally {
      setLocalLoading(false);
    }
  };

  const handlePhoneAction = async () => {
    if (!phone) {
      Alert.alert("Error", "Please enter a phone number");
      return;
    }
    setLocalLoading(true);
    try {
      if (isRegister) {
        const result = await registerWithPhone({ phone, name }); // Use phone as entered (e.g., 0201818192)
        if (result && result.userId && result.token) {
          const { userId, token } = result;
          setPhoneToken({ userId, token });
          Alert.alert("Success", "OTP sent to your phone for verification");
        } else {
          Alert.alert("Error", "Registration failed. Please try again.");
        }
      } else {
        const { userId, token } = await loginWithPhone(phone); // Use phone as entered (e.g., 0201818192)
        setPhoneToken({ userId, token });
        Alert.alert("Success", "OTP sent to your phone");
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "Failed to send OTP. Please try again."
      );
    } finally {
      setLocalLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !phoneToken) {
      Alert.alert("Error", "Please enter the OTP");
      return;
    }
    setLocalLoading(true);
    try {
      const result = await verifyPhoneToken(phoneToken.userId, otp);
      if (result) {
        await refetchUser();
        router.replace("/(tabs)");
        setPhoneToken(null);
      } else {
        Alert.alert("Error", "Invalid OTP. Please try again.");
      }
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.message || "OTP verification failed. Please try again."
      );
    } finally {
      setLocalLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </SafeAreaView>
    );
  }

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
                onPress={() => setLoginMethod("email")}
                className={`py-2 px-4 rounded-full ${
                  loginMethod === "email" ? "bg-primary-300" : "bg-primary-100"
                }`}
              >
                <Text
                  className={`text-sm ${
                    loginMethod === "email" ? "text-white" : "text-black-300"
                  } font-rubik`}
                >
                  Email
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setLoginMethod("phone")}
                className={`py-2 px-4 rounded-full ${
                  loginMethod === "phone" ? "bg-primary-300" : "bg-primary-100"
                }`}
              >
                <Text
                  className={`text-sm ${
                    loginMethod === "phone" ? "text-white" : "text-black-300"
                  } font-rubik`}
                >
                  Phone
                </Text>
              </TouchableOpacity>
            </View>
            <View className="flex flex-row justify-center mt-4">
              <Text className="text-sm font-rubik text-black-200">
                Already have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => setIsRegister(!isRegister)}>
                <Text className="text-sm font-rubik text-primary-300 underline">
                  {isRegister ? "Login" : "Register"}
                </Text>
              </TouchableOpacity>
            </View>
            {loginMethod === "email" ? (
              <>
                <Text className="text-lg font-rubik text-black-200 text-center mt-12">
                  {isRegister ? "Register with Email" : "Login with Email"}
                </Text>
                {isRegister && (
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter full name"
                    placeholderTextColor="#666"
                    className="text-sm font-rubik text-black-300 border border-primary-200 rounded-lg p-3 mt-4"
                  />
                )}
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter email"
                  placeholderTextColor="#666"
                  className="text-sm font-rubik text-black-300 border border-primary-200 rounded-lg p-3 mt-4"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter password"
                  placeholderTextColor="#666"
                  className="text-sm font-rubik text-black-300 border border-primary-200 rounded-lg p-3 mt-4"
                  secureTextEntry
                />
                <TouchableOpacity
                  onPress={handleEmailAction}
                  className="bg-primary-300 rounded-full w-full py-5 mt-4"
                  disabled={localLoading}
                >
                  <Text className="text-white text-lg font-rubik-bold text-center">
                    {localLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : isRegister ? (
                      "Register"
                    ) : (
                      "Login"
                    )}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text className="text-lg font-rubik text-black-200 text-center mt-12">
                  {isRegister
                    ? "Register with Phone"
                    : "Login with Phone Number"}
                </Text>
                {isRegister && (
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter full name"
                    placeholderTextColor="#666"
                    className="text-sm font-rubik text-black-300 border border-primary-200 rounded-lg p-3 mt-4"
                  />
                )}
                {!phoneToken ? (
                  <>
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="Enter phone number (e.g., 0201818192)"
                      placeholderTextColor="#666"
                      className="text-sm font-rubik text-black-300 border border-primary-200 rounded-lg p-3 mt-4"
                      keyboardType="phone-pad"
                    />
                    <TouchableOpacity
                      onPress={handlePhoneAction}
                      className="bg-primary-300 rounded-full w-full py-5 mt-4"
                      disabled={localLoading}
                    >
                      <Text className="text-white text-lg font-rubik-bold text-center">
                        {localLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : isRegister ? (
                          "Register"
                        ) : (
                          "Send OTP"
                        )}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TextInput
                      value={otp}
                      onChangeText={setOtp}
                      placeholder="Enter OTP"
                      placeholderTextColor="#666"
                      className="text-sm font-rubik text-black-300 border border-primary-200 rounded-lg p-3 mt-4"
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      onPress={handleVerifyOtp}
                      className="bg-primary-300 rounded-full w-full py-5 mt-4"
                      disabled={localLoading}
                    >
                      <Text className="text-white text-lg font-rubik-bold text-center">
                        {localLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          "Verify OTP"
                        )}
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
