/**
 * SearchBar Component
 * Reusable search input with glass effect and filter button.
 */

import React from "react";
import { View, TextInput, Pressable } from "react-native";
import { useGlass } from "../../hooks/useGlass";
import { useColors } from "../../context/ThemeContext";
import { typography } from "../../lib/fonts";
import { spacing, borderRadius, haptics } from "../../lib/theme";
import { AppIcon } from "../ui";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilterPress: () => void;
  filterActive?: boolean;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search...",
  onFilterPress,
  filterActive = false,
}: SearchBarProps) {
  const colors = useColors();
  const { GlassView } = useGlass();

  const searchInputContent = (
    <View
      style={{
        flexDirection: "row",
        paddingVertical: spacing[2],
        paddingHorizontal: spacing[3],
        gap: spacing[2],
        alignItems: "center",
      }}
    >
      <AppIcon name="magnifyingglass" size={16} tintColor={colors.onSurfaceDisabled} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.onSurfaceDisabled}
        returnKeyType="search"
        style={{
          flex: 1,
          ...typography.bodyMedium,
          color: colors.onSurface,
          padding: 0,
        }}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText("")}>
          <AppIcon name="xmark.circle.fill" size={16} tintColor={colors.onSurfaceDisabled} />
        </Pressable>
      )}
    </View>
  );

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing[2],
      }}
    >
      {/* Search Input */}
      {GlassView ? (
        <GlassView
          style={{
            flex: 1,
            borderRadius: 9999,
            overflow: "hidden",
          }}
        >
          {searchInputContent}
        </GlassView>
      ) : (
        <View
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.outline,
            borderRadius: 9999,
            borderCurve: "continuous",
          }}
        >
          {searchInputContent}
        </View>
      )}

      {/* Filter Button — wrap in a View so the active dot isn't clipped by overflow:hidden */}
      <View style={{ width: 40, height: 40 }}>
        {filterActive && (
          <View
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: colors.primary,
              zIndex: 1,
            }}
          />
        )}
        {GlassView ? (
          <GlassView
            isInteractive
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              borderCurve: "continuous",
              overflow: "hidden",
            }}
          >
            <Pressable
              onPress={() => {
                haptics.light();
                onFilterPress();
              }}
              style={{
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AppIcon
                name="line.3.horizontal.decrease.circle"
                size={20}
                tintColor={colors.onSurfaceVariant}
              />
            </Pressable>
          </GlassView>
        ) : (
          <Pressable
            onPress={() => {
              haptics.light();
              onFilterPress();
            }}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.outline,
              alignItems: "center",
              justifyContent: "center",
              borderCurve: "continuous",
            }}
          >
            <AppIcon
              name="line.3.horizontal.decrease.circle"
              size={20}
              tintColor={colors.onSurfaceVariant}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default SearchBar;
