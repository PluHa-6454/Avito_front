import type { Role } from '@/shared/api/schemas'

export type TestUserOption = {
  email: string
  name: string
  role: Role
  teamName: string
  description: string
}

export const TEST_USER_OPTIONS: TestUserOption[] = [
  {
    email: 'intern@test.local',
    name: 'Анна Стажёрова',
    role: 'intern',
    teamName: 'Команда A',
    description: 'Первый месяц. Онбординг, доступы, первая задача и отгул.',
  },
  {
    email: 'intern2@test.local',
    name: 'Борис Новиков',
    role: 'intern',
    teamName: 'Команда B',
    description: 'Другая команда. Проверка изоляции базы знаний.',
  },
  {
    email: 'mentor@test.local',
    name: 'Мария Петрова',
    role: 'mentor',
    teamName: 'Команда A',
    description: 'Наставник. Видит вопросы стажёров и может согласовывать.',
  },
  {
    email: 'lead@test.local',
    name: 'Илья Соколов',
    role: 'lead',
    teamName: 'Команда A',
    description: 'Руководитель. Согласует отгулы и дополнительные доступы.',
  },
]
