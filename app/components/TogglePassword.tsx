// Packages
import { useState } from "react";

// Components
import Eye from "./Eye";

export default function TogglePassword() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative">
      <label htmlFor="password" className="sr-only">
        Password
      </label>
      <input
        id="password"
        name="password"
        type={showPassword ? "text" : "password"}
        required
        className="relative block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        placeholder="Password"
      />
      <button
        type="button"
        className="absolute inset-y-0 right-0 pr-3 flex items-center"
        onClick={() => setShowPassword(!showPassword)}
      >
        <Eye slashed={showPassword} />
      </button>
    </div>
  );
}
