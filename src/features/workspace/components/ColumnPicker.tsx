import React, { useState } from "react";
import { Pressable, View } from "react-native";
import type { PageContract } from "../../../domain/contracts/types";
import {
  columnOptions,
  defaultColumnIds,
} from "../../../domain/contracts/columns";
import { useTheme } from "../../../shared/theme/Theme";
import { Dialog } from "../../../shared/ui/Dialog";
import { Icon } from "../../../shared/ui/Icon";
import { Button, Row, Txt } from "../../../shared/ui/Primitives";

export function ColumnPicker({
  page,
  selected,
  onChange,
}: {
  page: PageContract;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  const options = columnOptions(page);
  return (
    <>
      <Button
        compact
        label="Columns"
        icon="settings"
        onPress={() => setOpen(true)}
      />
      {open && (
        <Dialog title="Visible columns" onClose={() => setOpen(false)}>
          <Txt size={12} color={c.muted}>
            Choose the details shown in this view. Your selection is saved.
          </Txt>
          <View style={{ gap: 2 }}>
            {options.map((column) => {
              const checked = selected.includes(column.id);
              const required = column.id === page.columns[0]?.id;
              return (
                <Pressable
                  key={column.id}
                  accessibilityRole="checkbox"
                  accessibilityLabel={column.label}
                  accessibilityState={{ checked, disabled: required }}
                  disabled={required}
                  onPress={() =>
                    onChange(
                      checked
                        ? selected.filter((id) => id !== column.id)
                        : [...selected, column.id],
                    )
                  }
                  style={({ pressed, hovered }: any) => ({
                    minHeight: 44,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    backgroundColor:
                      pressed || hovered ? c.primarySoft : c.surface,
                  })}
                >
                  <View
                    style={{
                      width: 19,
                      height: 19,
                      borderRadius: 4,
                      borderWidth: 1,
                      borderColor: checked ? c.actionPrimary : c.border,
                      backgroundColor: checked ? c.actionPrimary : c.surface,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {checked && (
                      <Icon name="check" size={13} color={c.actionInk} />
                    )}
                  </View>
                  <Txt size={13} style={{ flex: 1 }}>
                    {column.label}
                  </Txt>
                  {required && (
                    <Txt size={10} color={c.muted}>
                      Always shown
                    </Txt>
                  )}
                </Pressable>
              );
            })}
          </View>
          <Row
            style={{
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <Row style={{ flexWrap: "wrap", gap: 8 }}>
              <Button
                compact
                label="Show all"
                onPress={() => onChange(options.map((column) => column.id))}
              />
              <Button
                compact
                label="Reset defaults"
                onPress={() => onChange(defaultColumnIds(page))}
              />
            </Row>
            <Button
              compact
              label="Done"
              variant="primary"
              onPress={() => setOpen(false)}
            />
          </Row>
        </Dialog>
      )}
    </>
  );
}
