"use client"

import { ErrorMessage } from "formik"
import React, { ChangeEventHandler } from "react"
//ANCHOR -
import { Label } from "../ui/label"
import { Input } from "../ui/input"
import { Textarea } from "../ui/textarea"
import { Eye, EyeOff } from "../icons"

interface CustomFormFieldProps {
  id: string
  type: string
  placeholder: string
  value: any
  onChange: ChangeEventHandler<any>
  onBlur: ChangeEventHandler<any>
  //   labelClassName?: string
  //   inputClassName?: string
  disabled?: boolean
  required: boolean
  styleClasses?: {
    parentDiv: string
    labelClassName: string
    inputClassName: string
  }
  /** For type="number": min value */
  min?: number
  /** For type="number": max value */
  max?: number
}

const CustomFormField = ({
  id,
  type,
  placeholder,
  value,
  onChange,
  onBlur,
  //   labelClassName,
  //   inputClassName,
  disabled = false,
  required,
  styleClasses,
  min,
  max,
}: CustomFormFieldProps) => {
  const [showPassword, setShowPassword] = React.useState(false)

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev)
  }

  return (
    <div className={styleClasses?.parentDiv}>
        <Label htmlFor={id} className={styleClasses?.labelClassName || ""}>
          {placeholder}
          {required && <span className="text-red-600"> *</span>}
        </Label>
      <div className={styleClasses?.inputClassName}>
        {type === "textarea" ? (
          <Textarea
            className={`p-2 border rounded focus-visible:ring-offset-0! ${
              styleClasses?.inputClassName || ""
            }`}
            id={id}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
          />
        ) : type === "password" ? (
          <div className="relative">
            <Input
              className={`p-2 border rounded focus-visible:ring-offset-0! ${
                styleClasses?.inputClassName || ""
              }`}
              type={showPassword ? "text" : type} // Toggle password visibility
              id={id}
              value={value}
              onChange={onChange}
              onBlur={onBlur}
              placeholder={placeholder}
              disabled={disabled}
            />
            <div
              className="absolute right-5 inset-y-0 flex items-center justify-center cursor-pointer"
              onClick={togglePasswordVisibility}
            >
              {showPassword ? (
                <EyeOff className="text-black" />
              ) : (
                <Eye className="text-black" />
              )}
            </div>
          </div>
        ) : (
          <Input
            className={`p-2 border rounded focus-visible:ring-offset-0! ${
              styleClasses?.inputClassName || ""
            }`}
            type={type}
            id={id}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            accept={type === "file" ? ".apk" : undefined}
            min={type === "number" ? min : undefined}
            max={type === "number" ? max : undefined}
          />
        )}
        <ErrorMessage
          name={id}
          component="div"
          className="invalid-feedback text-red-600 text-sm whitespace-pre-wrap pt-1 sm:pt-0"
        />
      </div>
    </div>
  )
}

export default CustomFormField
