import { StatusBar } from "expo-status-bar";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../src/lib/colors";
import { typography } from "../src/lib/fonts";

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modal</Text>
      <View style={styles.separator} />
      <Text style={styles.description}>
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
    backgroundColor: colors.background,
    padding: 20,
  },
  title: {
    ...typography.h3,
    color: colors.onSurface,
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: "80%",
    backgroundColor: colors.outline,
  },
  description: {
    ...typography.bodyMedium,
    color: colors.onSurfaceVariant,
    textAlign: "center",
  },
});
