/**
 * AutocompleteDropdown Component
 * A searchable dropdown with autocomplete functionality
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppIcon } from "../ui";
import { useColors } from "../../context/ThemeContext";
import { typography } from "../../lib/fonts";
import { borderRadius, haptics } from "../../lib/theme";

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
  const insets = useSafeAreaInsets();
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
    setIsOpen(false);
    setSearchText("");
  }, []);

  const handleSelect = useCallback(
    (option: DropdownOption) => {
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
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.background, paddingTop: insets.top }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.outline }]}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <AppIcon name="xmark.circle.fill" size={24} tintColor={colors.onSurfaceVariant} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.onSurface }]}>{label}</Text>
            <View style={styles.closeButton} />
          </View>

          <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.outline }]}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.surfaceVariant, color: colors.onSurface }]}
              placeholder="Search..."
              placeholderTextColor={colors.onSurfaceDisabled}
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
              returnKeyType="search"
            />
          </View>

          {groupBy && groupedOptions ? (
            renderGroupedList()
          ) : (
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.value}
              renderItem={renderOption}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>No results found</Text>
                </View>
              }
            />
          )}
        </View>
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
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    ...typography.h4,
    flex: 1,
    textAlign: "center",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInput: {
    ...typography.bodyMedium,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  listContent: {
    padding: 16,
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
