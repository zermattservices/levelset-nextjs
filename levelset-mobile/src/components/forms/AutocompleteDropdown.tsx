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
import { colors } from "../../lib/colors";
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
          style={[styles.option, isSelected && styles.optionSelected]}
          onPress={() => handleSelect(item)}
          activeOpacity={0.7}
        >
          <View style={styles.optionContent}>
            <Text
              style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}
            >
              {item.label}
            </Text>
            {item.subtitle && (
              <Text style={styles.optionSubtitle}>{item.subtitle}</Text>
            )}
          </View>
          {isSelected && (
            <AppIcon name="checkmark" size={18} tintColor={colors.primary} />
          )}
        </TouchableOpacity>
      );
    },
    [value, handleSelect]
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
            <Text style={styles.groupHeader}>{group}</Text>
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
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      <TouchableOpacity
        style={[
          styles.trigger,
          disabled && styles.triggerDisabled,
          error && styles.triggerError,
        ]}
        onPress={handleOpen}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.triggerText,
            !selectedOption && styles.triggerPlaceholder,
          ]}
          numberOfLines={1}
        >
          {selectedOption?.label || placeholder}
        </Text>
        <AppIcon name="chevron.down" size={16} tintColor={colors.onSurfaceVariant} />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <AppIcon name="xmark.circle.fill" size={24} tintColor={colors.onSurfaceVariant} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{label}</Text>
            <View style={styles.closeButton} />
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
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
                  <Text style={styles.emptyText}>No results found</Text>
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
    color: colors.onSurface,
    marginBottom: 6,
  },
  required: {
    color: colors.error,
  },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  triggerDisabled: {
    backgroundColor: colors.surfaceDisabled,
    opacity: 0.6,
  },
  triggerError: {
    borderColor: colors.error,
  },
  triggerText: {
    ...typography.bodyMedium,
    color: colors.onSurface,
    flex: 1,
  },
  triggerPlaceholder: {
    color: colors.onSurfaceDisabled,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    ...typography.h4,
    color: colors.onSurface,
    flex: 1,
    textAlign: "center",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline,
  },
  searchInput: {
    ...typography.bodyMedium,
    backgroundColor: colors.surfaceVariant,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.onSurface,
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
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderCurve: "continuous",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  optionSelected: {
    backgroundColor: colors.primaryTransparent,
    borderColor: colors.primary,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    ...typography.bodyMedium,
    color: colors.onSurface,
  },
  optionLabelSelected: {
    color: colors.primary,
    fontWeight: "600",
  },
  optionSubtitle: {
    ...typography.bodySmall,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  groupHeader: {
    ...typography.labelMedium,
    color: colors.onSurfaceVariant,
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
    color: colors.onSurfaceVariant,
  },
});

export default AutocompleteDropdown;
