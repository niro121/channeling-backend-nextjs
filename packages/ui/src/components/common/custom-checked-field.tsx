"use client"
import { ErrorMessage } from "formik"
import { ChangeEventHandler } from "react"
//ANCHOR -
import { Label } from "../ui/label"
import { Checkbox } from "../ui/checkbox"

interface CustomCheckedFieldProps {
  id: string
  placeholder: string
  value: any
  onChange: ChangeEventHandler<any>
  disabled?: boolean
  required: boolean
  options: any[]
  styleClasses?: {
    parentDiv: string
    labelClassName: string
    inputClassName: string
  }
}

const CustomCheckedField = ({
  id,
  placeholder,
  value,
  onChange,
  disabled = false,
  required,
  options,
  styleClasses,
}: CustomCheckedFieldProps) => {
  return (
    <div>
      <div className="flex gap-3">
        <Label htmlFor={id} className={styleClasses?.labelClassName || ""}>
          {placeholder}
          {required && <span className="text-red-600">*</span>}
        </Label>
        <div>
          {options.map((val) => (
            <div key={val.id} className="flex items-center align-middle mb-3">
              <Checkbox
                id={id}
                disabled={disabled}
                checked={value === val.id}
                onCheckedChange={() => onChange(val.id)}
              />
              <label
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ml-1"
              >
                {val.name}
              </label>
            </div>
          ))}
        </div>
      </div>
      <ErrorMessage
        name={id}
        component="div"
        className="invalid-feedback text-red-600"
      />
    </div>
  )
}

export default CustomCheckedField
