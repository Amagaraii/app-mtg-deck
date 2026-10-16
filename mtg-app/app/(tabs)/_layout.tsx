import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#111",
        tabBarLabelStyle: { fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Tirage",
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🎲</Text>,
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: "Collection",
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📚</Text>,
        }}
      />
      <Tabs.Screen
        name="decks"
        options={{
          title: "Decks",
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🃏</Text>,
        }}
      />
    </Tabs>
  );
}
