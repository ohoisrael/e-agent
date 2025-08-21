import { Alert, Image, SafeAreaView, ScrollView, Text, TouchableOpacity, View, TextInput, Modal, ImageSourcePropType } from "react-native";
import React, { useState, useEffect } from "react";
import icons from "@/constants/icons";
import images from "@/constants/images";
import { useGlobalContext } from "@/lib/global-provider";
import { useRouter } from "expo-router";
import { settings } from "@/constants/data";
import PropertyForm from "@/components/PropertyForm";
import { logout, getPendingProperties, approveProperty } from "@/lib/appwrite";

interface SettingsItemProp {
  icon: ImageSourcePropType;
  title: string;
  onPress?: () => void;
  textStyle?: string;
  showArrow?: boolean;
}

const SettingsItem = ({
  icon,
  title,
  onPress,
  textStyle,
  showArrow = true,
}: SettingsItemProp) => (
  <TouchableOpacity
    onPress={onPress}
    className="flex flex-row items-center justify-between py-3"
  >
    <View className="flex flex-row items-center gap-3">
      <Image source={icon} className="size-6" />
      <Text className={`text-lg font-rubik-medium text-black-300 ${textStyle}`}>
        {title}
      </Text>
    </View>
    {showArrow && <Image source={icons.rightArrow} className="size-5" />}
  </TouchableOpacity>
);

const NameUpdateForm = ({ onClose, userId }: { onClose: () => void; userId: string }) => {
  const { refetchUser } = useGlobalContext();
  const [name, setName] = useState("");
  const [updating, setUpdating] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a valid name");
      return;
    }

    setUpdating(true);
    try {
      await updateUserName(userId, name.trim());
      Alert.alert("Success", "Name updated successfully");
      refetchUser();
      onClose();
    } catch (error: any) {
      Alert.alert("Error", `Failed to update name: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <View className="bg-white p-5 rounded-lg mx-5 my-3">
      <Text className="text-xl font-rubik-bold mb-4">Update Name</Text>
      <TextInput
        className="border border-primary-200 bg-gray-50 p-3 rounded-lg mb-3 text-black-300"
        placeholder="Enter your name"
        placeholderTextColor="#6B7280"
        value={name}
        onChangeText={setName}
        returnKeyType="done"
      />
      <View className="flex flex-row justify-between">
        <TouchableOpacity
          onPress={onClose}
          className="bg-gray-300 p-3 rounded-lg flex-1 mr-2"
        >
          <Text className="text-black text-center">Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit}
          className="bg-primary-300 p-3 rounded-lg flex-1"
          disabled={updating}
        >
          <Text className="text-white text-center">{updating ? "Updating..." : "Update Name"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const PropertyApprovalItem = ({ property, onApprove, onReject }: { 
  property: any; 
  onApprove: (id: string) => void; 
  onReject: (id: string) => void 
}) => (
  <View className="bg-white p-4 mb-3 rounded-lg shadow">
    <Text className="text-lg font-rubik-bold">{property.name}</Text>
    <Text className="text-sm text-gray-600">{property.address}</Text>
    <View className="flex flex-row justify-between mt-3">
      <TouchableOpacity
        onPress={() => onApprove(property._id)}
        className="bg-green-500 p-2 rounded-lg flex-1 mr-2"
      >
        <Text className="text-white text-center">Approve</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onReject(property._id)}
        className="bg-red-500 p-2 rounded-lg flex-1"
      >
        <Text className="text-white text-center">Reject</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const Profile = () => {
  const { user, refetchUser } = useGlobalContext();
  const router = useRouter();
  const [showAddProperty, setShowAddProperty] = useState(false);
  const [showNameForm, setShowNameForm] = useState(false);
  const [pendingProperties, setPendingProperties] = useState([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'approvals'>('profile');

  useEffect(() => {
    if (user?.role === 'superadmin') {
      fetchPendingProperties();
    }
  }, [user]);

  const fetchPendingProperties = async () => {
    try {
      const properties = await getPendingProperties();
      setPendingProperties(properties);
    } catch (error) {
      Alert.alert("Error", "Failed to fetch pending properties");
    }
  };

  const handleApproveProperty = async (propertyId: string) => {
    try {
      await approveProperty(propertyId, 'approved');
      Alert.alert("Success", "Property approved successfully");
      fetchPendingProperties();
    } catch (error: any) {
      Alert.alert("Error", `Failed to approve property: ${error.message}`);
    }
  };

  const handleRejectProperty = async (propertyId: string) => {
    try {
      await approveProperty(propertyId, 'rejected');
      Alert.alert("Success", "Property rejected successfully");
      fetchPendingProperties();
    } catch (error: any) {
      Alert.alert("Error", `Failed to reject property: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    const result = await logout();
    if (result) {
      await refetchUser();
      router.replace("/sign-in");
    } else {
      Alert.alert("Error", "Failed to logout");
    }
  };

  const isPhoneUser = user?.phone && !user?.email;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {user?.role === 'superadmin' && (
        <View className="flex flex-row justify-around p-4 bg-gray-100">
          <TouchableOpacity
            onPress={() => setActiveTab('profile')}
            className={`p-2 ${activeTab === 'profile' ? 'bg-primary-300 text-white' : 'bg-gray-200'}`}
          >
            <Text className={`text-lg ${activeTab === 'profile' ? 'text-white' : 'text-black'}`}>
              Profile
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('approvals')}
            className={`p-2 ${activeTab === 'approvals' ? 'bg-primary-300 text-white' : 'bg-gray-200'}`}
          >
            <Text className={`text-lg ${activeTab === 'approvals' ? 'text-white' : 'text-black'}`}>
              Property Approvals
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {activeTab === 'profile' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-32 px-7"
        >
          <View className="flex flex-row items-center justify-between mt-5">
            <Text className="text-xl font-rubik-bold">Profile</Text>
            
          </View>
          <View className="flex flex-row justify-center mt-5">
            <View className="flex flex-col items-center relative mt-5">
              <Image
                source={{ uri: user?.avatar || images.student }}
                className="size-44 rounded-full"
                onError={(e) => console.log("Avatar load error:", e.nativeEvent.error)}
              />
              
              <Text className="text-2xl font-rubik-bold mt-2">
                {user?.name || "User"}
              </Text>
              <Text className="text-lg font-rubik-medium text-black-200">
                {user?.email || user?.phone || "No contact info"}
              </Text>
            </View>
          </View>
          {user?.role === "admin" && (
            <View className="flex flex-col mt-10 border-t pt-5 border-primary-200">
              <Text className="text-xl font-rubik-bold mb-3">Landlord Actions</Text>
              <SettingsItem
                icon={icons.home}
                title="Add Property"
                onPress={() => setShowAddProperty(true)}
              />
              <SettingsItem
                icon={icons.wallet}
                title="View All Payments"
                onPress={() => router.push("/admin/payments")}
              />
            </View>
          )}
          {user?.role !== "admin" && user?.role !== "superadmin" && (
            <View className="flex flex-col mt-10">
              <SettingsItem
                icon={icons.wallet}
                title="My Payments"
                onPress={() => router.push("/payments")}
              />
            </View>
          )}
          <View className="flex flex-col mt-5 border-t pt-5 border-primary-200">
            {settings.slice(2).map((item, index) => (
              <SettingsItem key={index} {...item} />
            ))}
          </View>
          <View className="flex flex-col border-t mt-5 pt-5 border-primary-200">
            <SettingsItem
              icon={icons.logout}
              title="Logout"
              textStyle="text-danger"
              showArrow={false}
              onPress={handleLogout}
            />
          </View>
        </ScrollView>
      )}
      
      {activeTab === 'approvals' && user?.role === 'superadmin' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-32 px-7"
        >
          <Text className="text-xl font-rubik-bold mt-5">Pending Properties</Text>
          {pendingProperties.length === 0 ? (
            <Text className="text-lg text-gray-500 mt-5">No pending properties</Text>
          ) : (
            pendingProperties.map((property: any) => (
              <PropertyApprovalItem
                key={property._id}
                property={property}
                onApprove={handleApproveProperty}
                onReject={handleRejectProperty}
              />
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={showAddProperty} animationType="slide" transparent={false}>
        <SafeAreaView className="flex-1 bg-white">
          <PropertyForm onClose={() => setShowAddProperty(false)} />
        </SafeAreaView>
      </Modal>
      <Modal visible={showNameForm} animationType="slide" transparent={false}>
        <SafeAreaView className="flex-1 bg-white">
          <NameUpdateForm
            onClose={() => setShowNameForm(false)}
            userId={user?._id || user?.$id || ""}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default Profile;