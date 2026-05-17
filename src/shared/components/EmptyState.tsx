import { motion } from 'motion/react'
import * as Illustrations from '@/shared/assets/illustrations'

const illustrationMap = {
  notes: Illustrations.NotesIllustration,
  tasks: Illustrations.TasksIllustration,
  kanban: Illustrations.KanbanIllustration,
  flows: Illustrations.FlowsIllustration,
  vault: Illustrations.VaultIllustration,
  capture: Illustrations.CaptureIllustration,
  calendar: Illustrations.CalendarIllustration,
  voice: Illustrations.VoiceIllustration,
  search: Illustrations.SearchEmptyIllustration,
  welcome: Illustrations.WelcomeIllustration,
  analytics: Illustrations.AnalyticsIllustration,
  share: Illustrations.ShareIllustration,
  levelup: Illustrations.LevelUpIllustration,
}

export function EmptyState({
  type,
  title,
  description,
  action,
}: {
  type: keyof typeof illustrationMap
  title: string
  description: string
  action?: { label: string; onClick: () => void }
}) {
  const Illustration = illustrationMap[type]
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center py-12 px-6 text-center gap-4"
    >
      <Illustration size={160} />
      <h3 className="text-[18px] font-semibold text-text-primary">{title}</h3>
      <p className="text-[14px] text-text-tertiary max-w-[280px] leading-relaxed">
        {description}
      </p>
      {action && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={action.onClick}
          className="px-5 py-2.5 rounded-xl bg-accent text-white font-medium text-[14px] cursor-pointer mt-2 border-none"
        >
          {action.label}
        </motion.button>
      )}
    </motion.div>
  )
}
