import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { BRAND } from '@erp/config/brand';

export default function MobileLoginScreen() {
  return (
    <View className="flex-1 justify-center px-6 bg-slate-50">
      <View className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <Text className="text-2xl font-bold text-center text-slate-900">{BRAND.name}</Text>
        <Text className="text-sm text-center text-slate-600 mt-1 mb-6">Sign In to Your Account</Text>

        <View className="space-y-4">
          <View>
            <Text className="text-xs font-medium text-slate-700 mb-1">Email or Username</Text>
            <TextInput
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900"
              placeholder="user@school.example.in"
              autoCapitalize="none"
            />
          </View>

          <View className="mt-3">
            <Text className="text-xs font-medium text-slate-700 mb-1">Password</Text>
            <TextInput
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-900"
              placeholder="••••••••"
              secureTextEntry
            />
          </View>

          <TouchableOpacity className="mt-6 bg-indigo-600 py-3 rounded-lg items-center">
            <Text className="text-white font-semibold text-sm">Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
