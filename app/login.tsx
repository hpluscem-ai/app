import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';

import { AppScreen } from '../components/AppScreen';
import { FormTextField } from '../components/auth/FormTextField';
import { PrimaryButton } from '../components/auth/PrimaryButton';
import { colors, typography } from '../constants/theme';
import { showLoginServerPendingAlert } from '../utils/alerts';
import { validateEmail, validatePassword } from '../utils/validation';

type LoginFormValues = {
  email: string;
  password: string;
};

export default function LoginRoute() {
  const router = useRouter();
  const {
    control,
    formState: { errors },
    handleSubmit,
    setFocus,
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const submitForm = handleSubmit(showLoginServerPendingAlert);

  return (
    <AppScreen
      contentStyle={styles.authContent}
      title="로그인"
      variant="auth"
    >
      <View style={styles.form}>
        <View style={styles.fields}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onBlur, onChange, ref, value } }) => (
              <FormTextField
                accessibilityLabel="이메일"
                autoComplete="email"
                error={errors.email?.message}
                inputRef={ref}
                keyboardType="email-address"
                label="이메일"
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={() => setFocus('password')}
                placeholder="이메일을 입력해주세요."
                returnKeyType="next"
                textContentType="username"
                value={value}
              />
            )}
            rules={{ validate: validateEmail }}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onBlur, onChange, ref, value } }) => (
              <FormTextField
                accessibilityLabel="비밀번호"
                autoComplete="current-password"
                error={errors.password?.message}
                inputRef={ref}
                label="비밀번호"
                onBlur={onBlur}
                onChangeText={onChange}
                onSubmitEditing={submitForm}
                placeholder="비밀번호를 입력해주세요."
                returnKeyType="done"
                secureTextEntry
                textContentType="password"
                value={value}
              />
            )}
            rules={{ validate: validatePassword }}
          />
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="로그인" onPress={submitForm} />

          <View accessibilityLabel="계정 관련 메뉴" style={styles.linkRow}>
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => router.push('/sign-up')}
            >
              <Text style={styles.linkText}>회원가입</Text>
            </Pressable>
            <Text style={styles.linkText}> · </Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => router.push('/find-email')}
            >
              <Text style={styles.linkText}>이메일 찾기</Text>
            </Pressable>
            <Text style={styles.linkText}> · </Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => router.push('/find-password')}
            >
              <Text style={styles.linkText}>비밀번호 찾기</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  authContent: {
    paddingVertical: 104,
  },
  form: {
    width: '100%',
    gap: 16,
  },
  fields: {
    gap: 16,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  linkRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  linkText: {
    ...typography.authBody,
    color: colors.black,
  },
});
