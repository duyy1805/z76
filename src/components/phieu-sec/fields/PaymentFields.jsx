import { memo, useDeferredValue, useEffect, useState } from "react";
import { TextField, Typography } from "@mui/material";
import { NumericFormat } from "react-number-format";
import {
    PAYMENT_CONTENT_FORBIDDEN_CHARS_TEXT,
    PAYMENT_CONTENT_MAX_LENGTH,
    amountToVietnameseText,
    validatePaymentContent,
} from "../../../utils/phieu-sec";

export const PaymentContentField = memo(function PaymentContentField({ value, onCommit }) {
    const [localValue, setLocalValue] = useState(value || "");
    const errorText = validatePaymentContent(localValue);
    const helperText = errorText ||
        `${String(localValue || "").trim().length}/${PAYMENT_CONTENT_MAX_LENGTH} ký tự. Không dùng: ${PAYMENT_CONTENT_FORBIDDEN_CHARS_TEXT}.`;

    useEffect(() => {
        setLocalValue(value || "");
    }, [value]);

    return (
        <TextField
            label="Nội dung"
            fullWidth
            value={localValue}
            onChange={(event) => setLocalValue(event.target.value)}
            onBlur={() => onCommit(localValue)}
            error={!!localValue && !!errorText}
            helperText={helperText}
            inputProps={{ maxLength: PAYMENT_CONTENT_MAX_LENGTH }}
        />
    );
});

export const BufferedTextField = memo(function BufferedTextField({
    value,
    onCommit,
    commitDelay = 350,
    onBlur,
    ...props
}) {
    const [localValue, setLocalValue] = useState(value ?? "");

    useEffect(() => {
        setLocalValue(value ?? "");
    }, [value]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            if (localValue !== (value ?? "")) onCommit(localValue);
        }, commitDelay);
        return () => window.clearTimeout(timer);
    }, [commitDelay, localValue, onCommit, value]);

    return (
        <TextField
            {...props}
            value={localValue}
            onChange={(event) => setLocalValue(event.target.value)}
            onBlur={(event) => {
                if (localValue !== (value ?? "")) onCommit(localValue);
                onBlur?.(event);
            }}
        />
    );
});

export const PaymentAmountField = memo(function PaymentAmountField({ value, currencyCode, onCommit }) {
    const [localValue, setLocalValue] = useState(value ?? "");
    const deferredValue = useDeferredValue(localValue);
    const amountText = amountToVietnameseText(deferredValue, currencyCode || "VND");

    useEffect(() => {
        setLocalValue(value ?? "");
    }, [value]);

    return (
        <>
            <NumericFormat
                customInput={TextField}
                label={`Số tiền (${currencyCode || "VND"})`}
                thousandSeparator="."
                decimalSeparator=","
                allowNegative={false}
                value={localValue}
                onValueChange={(values) => setLocalValue(values.floatValue ?? "")}
                onBlur={() => onCommit(localValue)}
            />
            {amountText && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: -1 }}>
                    Bằng chữ: {amountText}
                </Typography>
            )}
        </>
    );
});
