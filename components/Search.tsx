import { View, TextInput } from "react-native";
import { useState } from "react";

export default function Search({ query, onSearchChange }: { query: string; onSearchChange: (query: string) => void }) {
  const [searchQuery, setSearchQuery] = useState(query);

  const handleSearchChange = (value: string) => {
    console.log("Search input changed to:", value);
    setSearchQuery(value);
    onSearchChange(value);
  };

  return (
    <View className="flex-row items-center border border-gray-300 rounded-lg p-2 mb-2">
      <TextInput
        value={searchQuery}
        onChangeText={handleSearchChange}
        placeholder="Search properties..."
        placeholderTextColor="#666"
        style={{ flex: 1, fontSize: 16, color: "#333" }}
        autoFocus={true}
      />
    </View>
  );
}