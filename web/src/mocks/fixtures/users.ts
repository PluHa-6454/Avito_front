import type { User } from '../../shared/api/schemas'

export const TEST_USERS: User[] = [
  {
    id: 'u_intern_a',
    email: 'intern@test.local',
    name: 'Анна Стажёрова',
    role: 'intern',
    team_id: 'team_a',
    team_name: 'Команда A',
    onboarding_stage: 'week_1',
  },
  {
    id: 'u_intern_b',
    email: 'intern2@test.local',
    name: 'Борис Новиков',
    role: 'intern',
    team_id: 'team_b',
    team_name: 'Команда B',
    onboarding_stage: 'week_1',
  },
  {
    id: 'u_mentor_a',
    email: 'mentor@test.local',
    name: 'Мария Петрова',
    role: 'mentor',
    team_id: 'team_a',
    team_name: 'Команда A',
    onboarding_stage: null,
  },
  {
    id: 'u_lead_a',
    email: 'lead@test.local',
    name: 'Илья Соколов',
    role: 'lead',
    team_id: 'team_a',
    team_name: 'Команда A',
    onboarding_stage: null,
  },
]
