"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { createListCollection, Select, useSelect } from "@ark-ui/react/select";
import { Portal } from "@ark-ui/react/portal";
import { HugeiconsIcon } from "@hugeicons/react";
import ArrowDown01Icon from "@hugeicons/core-free-icons/ArrowDown01Icon";
import Tick02Icon from "@hugeicons/core-free-icons/Tick02Icon";
import "./admin-select.css";

export type SelectOption = { value: string; label: string };

type Props = {
  label: string;
  options: SelectOption[];
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  hideLabel?: boolean;
  hint?: string;
  className?: string;
  disabled?: boolean;
};

export function AdminSelect({ label, options, name, value, defaultValue, onValueChange, hideLabel, hint, className, disabled }: Props) {
  const hintId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [showPopup, setShowPopup] = useState(false);
  const collection = useMemo(() => createListCollection({ items: options }), [options]);

  const select = useSelect({
    collection, name, disabled,
    value: value === undefined ? undefined : [value],
    defaultValue: defaultValue === undefined ? undefined : [defaultValue],
    onOpenChange: ({ open }) => setShowPopup(open),
    onValueChange: ({ value: selected }) => onValueChange?.(selected[0] ?? ""),
    positioning: { placement: "bottom-start", strategy: "fixed", gutter: 6, sameWidth: true, overflowPadding: 10, hideWhenDetached: true },
  });

  function continueTabOrder(event: KeyboardEvent) {
    if (event.key !== "Tab" || !select.open) return;
    // Tab can arrive on the trigger before the opening list receives focus.
    event.stopPropagation();
    // Closing with the trigger keeps Ark from restoring focus on the next frame.
    flushSync(() => setShowPopup(false));
    trigger.current?.click();
    trigger.current?.focus({ preventScroll: true });
  }

  return <Select.RootProvider value={select} className={["adm-select", className].filter(Boolean).join(" ")} lazyMount unmountOnExit>
    <Select.Label className={hideLabel ? "adm-select-sr" : "adm-select-label"}>{label}</Select.Label>
    <Select.Trigger ref={trigger} onKeyDownCapture={continueTabOrder} className="adm-select-trigger" aria-describedby={hint ? hintId : undefined}>
      <Select.ValueText/><Select.Indicator className="adm-select-chevron">
        <HugeiconsIcon icon={ArrowDown01Icon} size={17} aria-hidden="true"/>
      </Select.Indicator>
    </Select.Trigger>
    <Select.HiddenSelect className="adm-select-native"/>
    {hint && <small className="adm-select-hint" id={hintId}>{hint}</small>}
    {showPopup && <Portal>
      <Select.Positioner className="adm-select-positioner">
        <Select.Content className="adm-select-popup" onKeyDownCapture={continueTabOrder}>
          {options.map(option => <Select.Item item={option} key={option.value} className="adm-select-option">
            <Select.ItemText>{option.label}</Select.ItemText>
            <Select.ItemIndicator><HugeiconsIcon icon={Tick02Icon} size={17} aria-hidden="true"/></Select.ItemIndicator>
          </Select.Item>)}
        </Select.Content>
      </Select.Positioner>
    </Portal>}
  </Select.RootProvider>;
}
