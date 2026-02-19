import { StatusBar } from "expo-status-bar";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "../src/context/ThemeContext";
import { typography } from "../src/lib/fonts";

export default function ModalScreen() {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.onSurface }]}>Modal</Text>
      <View style={[styles.separator, { backgroundColor: colors.outline }]} />
      <Text style={[styles.description, { color: colors.onSurfaceVariant }]}>
        This is a modal screen. You can present it from any route.
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    ...typography.h3,
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
  },
  description: {
    ...typography.bodyMedium,
    textAlign: "center",
  },
});
