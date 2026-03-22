/**
 * AutocompleteDropdown Component
 * A searchable dropdown with autocomplete functionality
 * Uses native formSheet presentation to match the edit-profile modal pattern
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  FlatList,
  Modal,
  Keyboard,
  ScrollView,
} from "react-native";
import { AppIcon } from "../ui";
import { useColors } from "../../context/ThemeContext";
import { GlassCard } from "../glass";
import { typography } from "../../lib/fonts";
import { borderRadius, spacing, haptics } from "../../lib/theme";
import { fontWeights } from "../../lib/fonts";

export interface DropdownOption {
  value: string;
  label: string;
  subtitle?: string;
  group?: string;
}

interface AutocompleteDropdownProps {
  label: string;
  placeholder?: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  groupBy?: boolean;
}

export function AutocompleteDropdown({
  label,
  placeholder = "Select...",
  options,
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  groupBy = false,
}: AutocompleteDropdownProps) {
  const colors = useColors();
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchText) return options;
    const search = searchText.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(search) ||
        opt.subtitle?.toLowerCase().includes(search)
    );
  }, [options, searchText]);

  const groupedOptions = useMemo(() => {
    if (!groupBy) return null;
    const groups: Record<string, DropdownOption[]> = {};
    filteredOptions.forEach((opt) => {
      const group = opt.group || "Other";
      if (!groups[group]) groups[group] = [];
      groups[group].push(opt);
    });
    return groups;
  }, [filteredOptions, groupBy]);

  const handleOpen = useCallback(() => {
    if (!disabled) {
      setIsOpen(true);
      setSearchText("");
    }
  }, [disabled]);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    setIsOpen(false);
    setSearchText("");
  }, []);

  const handleSelect = useCallback(
    (option: DropdownOption) => {
      Keyboard.dismiss();
      haptics.selection();
      onChange(option.value);
      handleClose();
    },
    [onChange, handleClose]
  );

  const renderOption = useCallback(
    ({ item }: { item: DropdownOption }) => {
      const isSelected = item.value === value;
      return (
        <TouchableOpacity
          style={[
            styles.option,
            { backgroundColor: colors.surface, borderColor: colors.outline },
            isSelected && { backgroundColor: colors.primaryTransparent, borderColor: colors.primary },
          ]}
          onPress={() => handleSelect(item)}
          activeOpacity={0.7}
        >
          <View style={styles.optionContent}>
            <Text
              style={[
                styles.optionLabel,
                { color: colors.onSurface },
                isSelected && { color: colors.primary, fontWeight: "600" },
              ]}
            >
              {item.label}
            </Text>
            {item.subtitle && (
              <Text style={[styles.optionSubtitle, { color: colors.onSurfaceVariant }]}>
                {item.subtitle}
              </Text>
            )}
          </View>
          {isSelected && (
            <AppIcon name="checkmark" size={18} tintColor={colors.primary} />
          )}
        </TouchableOpacity>
      );
    },
    [value, handleSelect, colors]
  );

  const renderGroupedList = () => {
    if (!groupedOptions) return null;
    const sections = Object.entries(groupedOptions);

    return (
      <FlatList
        data={sections}
        keyExtractor={([group]) => group}
        renderItem={({ item: [group, items] }) => (
          <View>
            <Text style={[styles.groupHeader, { color: colors.onSurfaceVariant }]}>{group}</Text>
            {items.map((item) => (
              <View key={item.value}>{renderOption({ item })}</View>
            ))}
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
      />
    );
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.onSurface }]}>
        {label}
        {required && <Text style={{ color: colors.error }}> *</Text>}
      </Text>

      <TouchableOpacity
        style={[
          styles.trigger,
          { backgroundColor: colors.surface, borderColor: colors.outline },
          disabled && { backgroundColor: colors.surfaceDisabled, opacity: 0.6 },
          error && { borderColor: colors.error },
        ]}
        onPress={handleOpen}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.triggerText,
            { color: colors.onSurface },
            !selectedOption && { color: colors.onSurfaceDisabled },
          ]}
          numberOfLines={1}
        >
          {selectedOption?.label || placeholder}
        </Text>
        <AppIcon name="chevron.down" size={16} tintColor={colors.onSurfaceVariant} />
      </TouchableOpacity>

      {error && <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>}

      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={handleClose}
      >
        <ScrollView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          contentContainerStyle={{ flex: 1 }}
          scrollEnabled={false}
          keyboardShouldPersistTaps="always"
        >
          {/* Header — matches edit-profile pattern: Cancel | Title | (spacer) */}
          <View style={styles.header}>
            <Pressable
              onPress={() => {
                haptics.light();
                handleClose();
              }}
              style={styles.headerButton}
            >
              <Text style={[styles.cancelText, { color: colors.primary }]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.onSurface }]}>{label}</Text>
            <View style={styles.headerButton} />
          </View>

          {/* Search */}
          <View style={styles.searchWrapper}>
            <GlassCard contentStyle={styles.searchCardContent}>
              <TextInput
                style={[styles.searchInput, { color: colors.onSurface }]}
                placeholder="Search..."
                placeholderTextColor={colors.onSurfaceDisabled}
                value={searchText}
                onChangeText={setSearchText}
                autoFocus
                returnKeyType="search"
              />
            </GlassCard>
          </View>

          {/* Options list */}
          {groupBy && groupedOptions ? (
            renderGroupedList()
          ) : (
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.value}
              renderItem={renderOption}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>No results found</Text>
                </View>
              }
            />
          )}
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    ...typography.labelLarge,
    marginBottom: 6,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  triggerText: {
    ...typography.bodyMedium,
    flex: 1,
  },
  errorText: {
    ...typography.bodySmall,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[5],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  headerButton: {
    minWidth: 60,
    padding: spacing[1],
  },
  headerTitle: {
    ...typography.h4,
    fontWeight: fontWeights.semibold,
    textAlign: "center",
    flex: 1,
  },
  cancelText: {
    ...typography.bodyMedium,
  },
  searchWrapper: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[3],
  },
  searchCardContent: {
    paddingVertical: 0,
    paddingHorizontal: spacing[4],
  },
  searchInput: {
    ...typography.bodyMedium,
    paddingVertical: 12,
  },
  listContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    marginBottom: 8,
    borderWidth: 1,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    ...typography.bodyMedium,
  },
  optionSubtitle: {
    ...typography.bodySmall,
    marginTop: 2,
  },
  groupHeader: {
    ...typography.labelMedium,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    ...typography.bodyMedium,
  },
});

export default AutocompleteDropdown;
