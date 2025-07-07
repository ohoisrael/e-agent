import { View } from "react-native";
import { useState } from "react";
import { Picker } from "@react-native-picker/picker";

export default function Filters({
  selectedFilter,
  onFilterChange,
}: {
  selectedFilter: string;
  onFilterChange: (filter: string) => void;
}) {
  const [filter, setFilter] = useState(selectedFilter);

  const handleFilterChange = (value: string) => {
    setFilter(value);
    onFilterChange(value); // Call the callback to update the parent state
  };

  return (
    <View className="border border-gray-300 rounded-lg">
      <Picker
        selectedValue={filter}
        onValueChange={handleFilterChange}
        style={{ height: 50, width: "100%" }}
      >
        <Picker.Item label="All" value="All" />
        <Picker.Item label="Apartment" value="Apartment" />
        <Picker.Item label="House" value="House" />
      </Picker>
    </View>
  );
}
