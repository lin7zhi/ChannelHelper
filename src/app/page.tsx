'use client'

import { useEffect, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Home, RefreshCw, Wrench, BarChart3, BookOpen,
  Plus, Trash2, Settings, Send, Link2, FolderTree,
  Replace, Rocket, Building2, Users, Zap,
  Cloud, Database, Bot, ChevronRight, X,
  Edit3, Clock, Shield, Hash, Target, Award,
  FileText, Layers, ExternalLink, Check, AlertCircle,
  Monitor, Activity, ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import * as api from '@/lib/api'

// ===== Types =====
interface UserData {
  groups: Array<{name: string; src: string; tgt: string[]}>
  stats_tasks: Array<Record<string, unknown>>
  dir_tasks: Array<Record<string, unknown>>
  address_book: Record<string, string>
}

interface AppData {
  user: UserData
  msg_count: number
  webdav_url: string
  userbot: boolean
}

// ===== Toast =====
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <motion.div
      initial={{ y: -100, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -100, opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'fixed top-6 left-1/2 -translate-x-1/2 z-[999] px-6 py-3 rounded-2xl glass-strong shadow-2xl flex items-center gap-3',
        type === 'success' ? 'border-l-2 border-l-mint' : 'border-l-2 border-l-accent'
      )}
    >
      {type === 'success' ? <Check className="w-4 h-4 text-mint" /> : <AlertCircle className="w-4 h-4 text-accent" />}
      <span className="text-sm font-medium">{message}</span>
    </motion.div>
  )
}

// ===== Modal Shell =====
function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-end justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 35 }}
            className="bg-surface-1 w-full max-w-lg max-h-[88vh] rounded-t-3xl overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-surface-1/95 backdrop-blur-xl z-10 px-6 pt-6 pb-4 border-b border-white/[0.04]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{title}</h2>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition">
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </div>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ===== Input =====
function Input({ label, hint, ...props }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">{label}</label>
      <input
        className="w-full px-4 py-3 bg-surface-3 border border-white/[0.06] rounded-xl text-sm text-text-primary
          placeholder:text-text-tertiary outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
        {...props}
      />
      {hint && <p className="text-[11px] text-text-tertiary">{hint}</p>}
    </div>
  )
}

// ===== TextArea =====
function TextArea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">{label}</label>
      <textarea
        className="w-full px-4 py-3 bg-surface-3 border border-white/[0.06] rounded-xl text-sm text-text-primary
          placeholder:text-text-tertiary outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all resize-none"
        {...props}
      />
    </div>
  )
}

// ===== Button =====
function Btn({ variant = 'primary', className, children, ...props }: {
  variant?: 'primary' | 'danger' | 'ghost' | 'success'
  className?: string
  children: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary: 'bg-gradient-to-r from-accent to-iris text-white shadow-lg shadow-accent/20 hover:shadow-accent/40',
    danger: 'bg-accent-muted text-accent hover:bg-accent/20',
    ghost: 'bg-white/[0.04] text-text-primary hover:bg-white/[0.08]',
    success: 'bg-mint-muted text-mint hover:bg-mint/20',
  }
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={cn(
        'px-5 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2',
        styles[variant], className
      )}
      {...props}
    >
      {children}
    </motion.button>
  )
}

// ===== Channel Chip =====
function ChannelChip({ cid, name, onClick }: { cid: string; name: string; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.04] border border-white/[0.06]
        hover:border-accent/30 hover:bg-accent-muted transition-all flex items-center gap-1.5"
    >
      <BookOpen className="w-3 h-3 text-accent" />
      {name}
    </motion.button>
  )
}

function ChannelPicker({ addressBook, onSelect }: {
  addressBook: Record<string, string>; onSelect: (id: string) => void
}) {
  if (!Object.keys(addressBook).length) return null
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {Object.entries(addressBook).map(([cid, name]) => (
        <ChannelChip key={cid} cid={cid} name={name} onClick={() => onSelect(cid)} />
      ))}
    </div>
  )
}

function chLabel(id: string, ab: Record<string, string>) {
  const name = ab[id] || ab[String(id)]
  return name ? `${name} (${id})` : id
}

// ===== Animated Background =====
function AuroraBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-accent/[0.03] blur-[120px] animate-float" />
      <div className="absolute -bottom-[30%] -right-[20%] w-[70%] h-[70%] rounded-full bg-iris/[0.04] blur-[120px] animate-float" style={{ animationDelay: '-3s' }} />
      <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-sea/[0.02] blur-[100px] animate-pulse-slow" />
    </div>
  )
}

// ===== Header =====
function Header({ user, data }: { user?: { first_name: string; photo_url?: string; id: number }; data: AppData | null }) {
  const hour = new Date().getHours()
  let greeting = '夜深了'
  if (hour >= 5 && hour < 12) greeting = '早上好'
  else if (hour >= 12 && hour < 14) greeting = '午安'
  else if (hour >= 14 && hour < 18) greeting = '下午好'
  else if (hour >= 18 && hour < 22) greeting = '晚上好'

  return (
    <motion.div
      initial={{ opacity: 0, y: -30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className="relative px-6 pt-8 pb-12 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-iris/5 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-surface-0 to-transparent" />
      <div className="relative flex items-center gap-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
          className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-iris flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-accent/30 overflow-hidden"
        >
          {user?.photo_url ? (
            <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span>{user?.first_name?.[0] || 'N'}</span>
          )}
        </motion.div>
        <div className="flex-1 min-w-0">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="text-xl font-bold tracking-tight"
          >
            {greeting}，{user?.first_name || '用户'}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xs text-text-secondary mt-1 font-mono"
          >
            Nine7 频道助手 — 控制台
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
          className={cn(
            'w-3 h-3 rounded-full',
            data?.userbot ? 'bg-mint shadow-lg shadow-mint/50' : 'bg-accent shadow-lg shadow-accent/50'
          )}
        />
      </div>
    </motion.div>
  )
}

// ===== Pages =====
const pageVariants = {
  enter: { opacity: 0, y: 20 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

function PageHome({ data }: { data: AppData | null }) {
  if (!data) return <div className="flex justify-center py-20"><Activity className="w-6 h-6 text-accent animate-spin" /></div>
  const u = data.user
  const stats = [
    { icon: RefreshCw, label: '同步组', value: u.groups.length, color: 'text-sea' },
    { icon: BarChart3, label: '统计任务', value: u.stats_tasks.length, color: 'text-iris' },
    { icon: FolderTree, label: '目录任务', value: u.dir_tasks.length, color: 'text-mint' },
    { icon: BookOpen, label: '地址簿', value: Object.keys(u.address_book).length, color: 'text-accent' },
  ]
  return (
    <motion.div variants={pageVariants} initial="enter" animate="center" exit="exit" className="px-6 space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-5 gradient-border"
      >
        <div className="flex items-center gap-2 mb-4">
          <Monitor className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold">系统状态</span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">云端存储</span>
            <span className="text-xs font-mono text-text-tertiary truncate max-w-[180px]">{data.webdav_url || '未配置'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">消息映射</span>
            <span className="font-mono text-sea">{data.msg_count}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">用户机器人</span>
            <span className={data.userbot ? 'text-mint font-medium' : 'text-accent font-medium'}>
              {data.userbot ? '在线' : '离线'}
            </span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.15 + i * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
            className="glass rounded-2xl p-4 group hover:bg-white/[0.04] transition-colors cursor-default"
          >
            <s.icon className={cn('w-5 h-5 mb-2', s.color)} />
            <div className="text-2xl font-bold tracking-tight">{s.value}</div>
            <div className="text-xs text-text-tertiary mt-0.5">{s.label}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

function PageSync({ data, onAdd, onDelete, toast }: {
  data: AppData | null; onAdd: () => void; onDelete: (idx: number) => void; toast: (msg: string, t: 'success'|'error') => void
}) {
  const groups = data?.user.groups || []
  const ab = data?.user.address_book || {}
  return (
    <motion.div variants={pageVariants} initial="enter" animate="center" exit="exit" className="px-6 space-y-4 pb-24">
      {groups.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <RefreshCw className="w-12 h-12 text-text-tertiary mx-auto" />
          <p className="text-sm text-text-secondary">暂无同步任务</p>
          <p className="text-xs text-text-tertiary">点击右下角按钮创建</p>
        </div>
      ) : groups.map((g, i) => {
        const tgts = Array.isArray(g.tgt) ? g.tgt : [g.tgt]
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">{g.name || `同步组 ${i + 1}`}</span>
              <button onClick={() => onDelete(i)} className="p-2 rounded-lg hover:bg-accent-muted transition">
                <Trash2 className="w-4 h-4 text-accent" />
              </button>
            </div>
            <div className="space-y-1.5 text-xs text-text-secondary">
              <div className="flex items-center gap-2">
                <ArrowRight className="w-3 h-3 text-sea" />
                <span>源: </span>
                <code className="font-mono text-sea bg-sea-muted px-2 py-0.5 rounded">{chLabel(g.src, ab)}</code>
              </div>
              {tgts.map((t, ti) => (
                <div key={ti} className="flex items-center gap-2 ml-5">
                  <ChevronRight className="w-3 h-3 text-text-tertiary" />
                  <code className="font-mono text-iris bg-iris-muted px-2 py-0.5 rounded">{chLabel(t, ab)}</code>
                </div>
              ))}
            </div>
          </motion.div>
        )
      })}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onAdd}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-iris text-white
          shadow-xl shadow-accent/30 flex items-center justify-center z-50"
      >
        <Plus className="w-6 h-6" />
      </motion.button>
    </motion.div>
  )
}

function PageTools({ onOpen }: { onOpen: (modal: string) => void }) {
  const tools = [
    { id: 'btnNew', icon: Send, name: '发送消息', desc: '支持媒体与格式化', color: 'from-accent/20 to-iris/20' },
    { id: 'btnOld', icon: Link2, name: '编辑按钮', desc: '给旧消息添加或修改按钮', color: 'from-iris/20 to-sea/20' },
    { id: 'genDir', icon: FolderTree, name: '手动目录', desc: '扫描频道生成标签目录', color: 'from-sea/20 to-mint/20' },
    { id: 'replace', icon: Replace, name: '替换标签', desc: '批量替换或删除标签', color: 'from-mint/20 to-accent/20' },
    { id: 'backup', icon: Rocket, name: '智能备份', desc: '跨频道全量搬运', color: 'from-accent/20 to-sea/20' },
    { id: 'btnMulti', icon: Layers, name: '多按钮消息', desc: '发送含多行按钮的消息', color: 'from-iris/20 to-mint/20' },
    { id: 'batchCreate', icon: Building2, name: '批量建频道', desc: '一键创建多个频道', color: 'from-sea/20 to-iris/20' },
    { id: 'backupMembers', icon: Users, name: '备份成员', desc: '导出频道成员列表', color: 'from-mint/20 to-sea/20' },
  ]

  return (
    <motion.div variants={pageVariants} initial="enter" animate="center" exit="exit" className="px-6">
      <div className="grid grid-cols-2 gap-3">
        {tools.map((t, i) => (
          <motion.button
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 25 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onOpen(t.id)}
            className={cn(
              'glass rounded-2xl p-5 text-left space-y-3 group transition-all hover:border-white/[0.08]',
              'relative overflow-hidden'
            )}
          >
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity', t.color)} />
            <div className="relative">
              <t.icon className="w-6 h-6 text-text-secondary group-hover:text-text-primary transition-colors" />
              <div className="text-sm font-semibold mt-3">{t.name}</div>
              <div className="text-[11px] text-text-tertiary mt-1">{t.desc}</div>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

function PageTasks({ data, toast: showToast }: { data: AppData | null; toast: (msg: string, t: 'success'|'error') => void }) {
  const [tab, setTab] = useState<'stats' | 'dirs'>('stats')
  const statsTasks = data?.user.stats_tasks || []
  const dirsTasks = data?.user.dir_tasks || []
  const ab = data?.user.address_book || {}

  return (
    <motion.div variants={pageVariants} initial="enter" animate="center" exit="exit" className="px-6 space-y-4 pb-24">
      <div className="flex gap-1 p-1 bg-surface-2 rounded-xl">
        {(['stats', 'dirs'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 py-2.5 text-sm font-medium rounded-lg transition-all',
              tab === t ? 'bg-gradient-to-r from-accent to-iris text-white shadow-md' : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {t === 'stats' ? '统计任务' : '目录任务'}
          </button>
        ))}
      </div>

      {tab === 'stats' && (
        statsTasks.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <BarChart3 className="w-10 h-10 text-text-tertiary mx-auto" />
            <p className="text-sm text-text-secondary">暂无统计任务</p>
          </div>
        ) : statsTasks.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-accent" />
                <span className="font-semibold text-sm">{String(t.task_name || '未命名')}</span>
              </div>
              <span className="text-[11px] text-text-tertiary bg-surface-3 px-2 py-1 rounded-lg font-mono">
                {String(t.interval || 60)}分钟
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
              <div>频道: <code className="text-sea font-mono">{chLabel(String(t.channel_id || ''), ab)}</code></div>
              <div>消息: <code className="text-iris font-mono">{String(t.msg_id || '')}</code></div>
              <div>标签: <code className="text-mint font-mono">{String(t.trigger_tag || '')}</code></div>
              <div>名额: 前 <code className="text-accent font-mono">{String(t.top_n || 10)}</code> 名</div>
            </div>
          </motion.div>
        ))
      )}

      {tab === 'dirs' && (
        dirsTasks.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <FolderTree className="w-10 h-10 text-text-tertiary mx-auto" />
            <p className="text-sm text-text-secondary">暂无目录任务</p>
          </div>
        ) : dirsTasks.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-mint" />
                <span className="font-semibold text-sm">{String(t.task_name || '未命名')}</span>
              </div>
              <span className="text-[11px] text-text-tertiary bg-surface-3 px-2 py-1 rounded-lg font-mono">
                {String(t.interval || 15)}分钟
              </span>
            </div>
            <div className="text-xs text-text-secondary space-y-1">
              <div>扫描: <code className="text-sea font-mono">{chLabel(String(t.scan_id || ''), ab)}</code></div>
              <div>已收录: <code className="text-accent font-mono">{(t.tags_cache as string[] || []).length}</code> 个标签</div>
            </div>
          </motion.div>
        ))
      )}
    </motion.div>
  )
}

function PageAddr({ data, onAdd, onDelete }: {
  data: AppData | null; onAdd: () => void; onDelete: (cid: string) => void
}) {
  const ab = data?.user.address_book || {}
  const entries = Object.entries(ab)
  return (
    <motion.div variants={pageVariants} initial="enter" animate="center" exit="exit" className="px-6 space-y-4 pb-24">
      {entries.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <BookOpen className="w-12 h-12 text-text-tertiary mx-auto" />
          <p className="text-sm text-text-secondary">暂无保存的频道</p>
          <p className="text-xs text-text-tertiary">点击右下角按钮添加</p>
        </div>
      ) : entries.map(([cid, name], i) => (
        <motion.div
          key={cid}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className="glass rounded-2xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-accent" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{name}</div>
              <code className="text-xs text-text-tertiary font-mono">{cid}</code>
            </div>
          </div>
          <button onClick={() => onDelete(cid)} className="p-2 rounded-lg hover:bg-accent-muted transition flex-shrink-0">
            <Trash2 className="w-4 h-4 text-accent" />
          </button>
        </motion.div>
      ))}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onAdd}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-iris text-white
          shadow-xl shadow-accent/30 flex items-center justify-center z-50"
      >
        <Plus className="w-6 h-6" />
      </motion.button>
    </motion.div>
  )
}

// ===== Bottom Nav =====
const NAV_ITEMS = [
  { id: 'home', icon: Home, label: '首页' },
  { id: 'sync', icon: RefreshCw, label: '同步' },
  { id: 'tools', icon: Wrench, label: '工具箱' },
  { id: 'tasks', icon: BarChart3, label: '任务' },
  { id: 'addr', icon: BookOpen, label: '地址簿' },
] as const

type PageId = typeof NAV_ITEMS[number]['id']

function BottomNav({ active, onChange }: { active: PageId; onChange: (id: PageId) => void }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 glass-strong border-t border-white/[0.04] z-[100]
      flex pb-[env(safe-area-inset-bottom)]">
      {NAV_ITEMS.map(item => (
        <button
          key={item.id}
          onClick={() => {
            onChange(item.id)
            try { window.Telegram?.WebApp.HapticFeedback.impactOccurred('light') } catch {}
          }}
          className={cn(
            'flex-1 flex flex-col items-center py-3 transition-all relative',
            active === item.id ? 'text-accent' : 'text-text-tertiary hover:text-text-secondary'
          )}
        >
          {active === item.id && (
            <motion.div
              layoutId="nav-indicator"
              className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-accent rounded-full"
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
          <item.icon className="w-5 h-5" />
          <span className="text-[10px] mt-1 font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  )
}

// ===== Main App =====
export default function App() {
  const [page, setPage] = useState<PageId>('home')
  const [data, setData] = useState<AppData | null>(null)
  const [user, setUser] = useState<{ first_name: string; photo_url?: string; id: number } | undefined>()
  const [toastMsg, setToastMsg] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [modal, setModal] = useState<string | null>(null)

  // Form states
  const [syncName, setSyncName] = useState('')
  const [syncSrc, setSyncSrc] = useState('')
  const [syncTgts, setSyncTgts] = useState([''])
  const [addrId, setAddrId] = useState('')
  const [addrName, setAddrName] = useState('')

  // Tool form states
  const [bnCh, setBnCh] = useState(''); const [bnText, setBnText] = useState(''); const [bnBtnText, setBnBtnText] = useState(''); const [bnUrl, setBnUrl] = useState('')
  const [boCh, setBoCh] = useState(''); const [boMsg, setBoMsg] = useState(''); const [boBtnText, setBoBtnText] = useState(''); const [boUrl, setBoUrl] = useState('')
  const [gdCh, setGdCh] = useState('')
  const [rpCh, setRpCh] = useState(''); const [rpOld, setRpOld] = useState(''); const [rpNew, setRpNew] = useState('')
  const [bkSrc, setBkSrc] = useState(''); const [bkTgts, setBkTgts] = useState(['']); const [bkLink, setBkLink] = useState(''); const [bkWash, setBkWash] = useState(false)
  const [bmCh, setBmCh] = useState(''); const [bmText, setBmText] = useState(''); const [bmBtns, setBmBtns] = useState([{text:'',url:''}])
  const [bcNames, setBcNames] = useState(''); const [bcUsers, setBcUsers] = useState(''); const [bcCount, setBcCount] = useState(1)
  const [bmChId, setBmChId] = useState('')

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ msg, type })
  }, [])

  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      tg.enableClosingConfirmation()
      api.setInitData(tg.initData)
      setUser(tg.initDataUnsafe?.user)
    }
    loadData()
  }, [])

  async function loadData() {
    const res = await api.fetchData()
    if (res.ok) setData(res)
  }

  const ab = data?.user.address_book || {}

  // ===== Actions =====
  async function handleAddSync() {
    const tgt = syncTgts.filter(t => t.trim())
    if (!syncSrc || !tgt.length) return showToast('请填写源频道和至少一个目标', 'error')
    const res = await api.addGroup({ name: syncName, src: syncSrc, tgt })
    if (res.ok) { showToast('同步组已创建'); setModal(null); setData({data!, user: res.user }); setSyncName(''); setSyncSrc(''); setSyncTgts(['']) }
    else showToast(res.msg || '失败', 'error')
  }

  async function handleDeleteSync(idx: number) {
    const res = await api.deleteGroup(idx)
    if (res.ok) { showToast('已删除'); setData({ ...data!, user: res.user }) }
  }

  async function handleAddChannel() {
    if (!addrId || !addrName) return showToast('请填写完整', 'error')
    const res = await api.addChannel(addrId, addrName)
    if (res.ok) { showToast('已添加'); setModal(null); setData({ ...data!, user: res.user }); setAddrId(''); setAddrName('') }
  }

  async function handleDeleteChannel(cid: string) {
    const res = await api.deleteChannel(cid)
    if (res.ok) { showToast('已删除'); setData({ ...data!, user: res.user }) }
  }

  async function handleSendBtnNew() {
    if (!bnCh) return showToast('请填写频道ID', 'error')
    const res = await api.sendBtnNew({ ch_id: bnCh, text: bnText, btn_text: bnBtnText, url: bnUrl })
    if (res.ok) { showToast('消息已发送'); setModal(null) } else showToast(res.msg || '失败', 'error')
  }

  async function handleSendBtnOld() {
    if (!boCh || !boMsg || !boBtnText) return showToast('请填写必填项', 'error')
    const res = await api.sendBtnOld({ ch_id: boCh, msg_id: boMsg, btn_text: boBtnText, url: boUrl })
    if (res.ok) { showToast('操作成功'); setModal(null) } else showToast(res.msg || '失败', 'error')
  }

  async function handleGenDir() {
    if (!gdCh) return showToast('请输入频道ID', 'error')
    const res = await api.genDir(gdCh)
    showToast(res.ok ? '扫描已启动，请在 Bot 对话中查看' : (res.msg || '失败'), res.ok ? 'success' : 'error')
    if (res.ok) setModal(null)
  }

  async function handleReplaceTag() {
    if (!rpCh || !rpOld) return showToast('请填写必填项', 'error')
    const res = await api.replaceTag({ ch_id: rpCh, old_tag: rpOld, new_tag: rpNew })
    showToast(res.ok ? '替换任务已启动' : (res.msg || '失败'), res.ok ? 'success' : 'error')
    if (res.ok) setModal(null)
  }

  async function handleStartBackup() {
    const tgts = bkTgts.filter(t => t.trim())
    if (!bkSrc || !tgts.length || !bkLink) return showToast('请填写完整', 'error')
    const res = await api.startBackup({ src: bkSrc, tgt: tgts, link: bkLink, wash: bkWash })
    showToast(res.ok ? `备份已启动 (${tgts.length} 个目标)` : (res.msg || '失败'), res.ok ? 'success' : 'error')
    if (res.ok) setModal(null)
  }

  async function handleSendBtnMulti() {
    const btns = bmBtns.filter(b => b.text.trim() && b.url.trim())
    if (!bmCh || !bmText || !btns.length) return showToast('请填写完整', 'error')
    const res = await api.sendBtnMulti({ ch_id: bmCh, text: bmText, buttons: btns })
    if (res.ok) { showToast('已发送'); setModal(null) } else showToast(res.msg || '失败', 'error')
  }

  async function handleBatchCreate() {
    if (!bcNames) return showToast('请输入频道名称', 'error')
    const res = await api.batchCreate({ names: bcNames, users: bcUsers, count: bcCount })
    if (res.ok) { showToast('批量创建已启动'); setModal(null) } else showToast(res.msg || '失败', 'error')
  }

  async function handleBackupMembers() {
    if (!bmChId) return showToast('请输入频道ID', 'error')
    const res = await api.backupMembers(bmChId)
    if (res.ok) { showToast('导出任务已启动'); setModal(null) } else showToast(res.msg || '失败', 'error')
  }

  return (
    <div className="min-h-screen bg-surface-0 pb-20">
      <AuroraBackground />
      <div className="relative z-10">
        <Header user={user} data={data} />

        <AnimatePresence mode="wait">
          {page === 'home' && <PageHome key="home" data={data} />}
          {page === 'sync' && <PageSync key="sync" data={data} onAdd={() => setModal('addSync')} onDelete={handleDeleteSync} toast={showToast} />}
          {page === 'tools' && <PageTools key="tools" onOpen={setModal} />}
          {page === 'tasks' && <PageTasks key="tasks" data={data} toast={showToast} />}
          {page === 'addr' && <PageAddr key="addr" data={data} onAdd={() => setModal('addAddr')} onDelete={handleDeleteChannel} />}
        </AnimatePresence>

        <BottomNav active={page} onChange={setPage} />

        {/* Toast */}
        <AnimatePresence>
          {toastMsg && <Toast message={toastMsg.msg} type={toastMsg.type} onClose={() => setToastMsg(null)} />}
        </AnimatePresence>

        {/* ===== Modals ===== */}

        {/* Add Sync */}
        <Modal open={modal === 'addSync'} onClose={() => setModal(null)} title="添加同步组">
          <div className="space-y-4">
            <Input label="同步组名称" placeholder="例如: 主频道分发" value={syncName} onChange={e => setSyncName(e.target.value)} />
            <div>
              <Input label="源频道 ID" placeholder="-100xxxxxxxxxx" value={syncSrc} onChange={e => setSyncSrc(e.target.value)} />
              <ChannelPicker addressBook={ab} onSelect={setSyncSrc} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">目标频道</label>
              {syncTgts.map((t, i) => (
                <div key={i}>
                  <input
                    className="w-full px-4 py-3 bg-surface-3 border border-white/[0.06] rounded-xl text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent/50 transition-all"
                    placeholder="-100xxxxxxxxxx"
                    value={t}
                    onChange={e => { const arr = [...syncTgts]; arr[i] = e.target.value; setSyncTgts(arr) }}
                  />
                  <ChannelPicker addressBook={ab} onSelect={v => { const arr = [...syncTgts]; arr[i] = v; setSyncTgts(arr) }} />
                </div>
              ))}
              <Btn variant="ghost" className="text-xs" onClick={() => setSyncTgts([...syncTgts, ''])}>
                <Plus className="w-3 h-3" /> 添加目标
              </Btn>
            </div>
            <Btn variant="primary" className="w-full" onClick={handleAddSync}>
              <Check className="w-4 h-4" /> 创建同步组
            </Btn>
          </div>
        </Modal>

        {/* Add Address */}
        <Modal open={modal === 'addAddr'} onClose={() => setModal(null)} title="添加频道">
          <div className="space-y-4">
            <Input label="频道 ID" placeholder="-100xxxxxxxxxx" value={addrId} onChange={e => setAddrId(e.target.value)} />
            <Input label="备注名称" placeholder="例如: 主频道" value={addrName} onChange={e => setAddrName(e.target.value)} />
            <Btn variant="primary" className="w-full" onClick={handleAddChannel}>
              <Check className="w-4 h-4" /> 保存
            </Btn>
          </div>
        </Modal>

        {/* Send Btn New */}
        <Modal open={modal === 'btnNew'} onClose={() => setModal(null)} title="发送消息">
          <div className="space-y-4">
            <div>
              <Input label="频道 ID" placeholder="-100xxxxxxxxxx" value={bnCh} onChange={e => setBnCh(e.target.value)} />
              <ChannelPicker addressBook={ab} onSelect={setBnCh} />
            </div>
            <TextArea label="消息正文 (支持 HTML)" rows={5} placeholder="输入消息内容..." value={bnText} onChange={e => setBnText(e.target.value)} />
            <Input label="按钮文字 (可选)" placeholder="点击跳转" value={bnBtnText} onChange={e => setBnBtnText(e.target.value)} />
            <Input label="按钮链接 (可选)" placeholder="https://..." type="url" value={bnUrl} onChange={e => setBnUrl(e.target.value)} />
            <Btn variant="primary" className="w-full" onClick={handleSendBtnNew}>
              <Send className="w-4 h-4" /> 发送
            </Btn>
          </div>
        </Modal>

        {/* Edit Btn Old */}
        <Modal open={modal === 'btnOld'} onClose={() => setModal(null)} title="编辑旧消息按钮">
          <div className="space-y-4">
            <div>
              <Input label="频道 ID" placeholder="-100xxxxxxxxxx" value={boCh} onChange={e => setBoCh(e.target.value)} />
              <ChannelPicker addressBook={ab} onSelect={setBoCh} />
            </div>
            <Input label="消息 ID 或链接" placeholder="消息ID" value={boMsg} onChange={e => setBoMsg(e.target.value)} />
            <Input label="按钮文字" placeholder="按钮文字或输入 delete 删除" value={boBtnText} onChange={e => setBoBtnText(e.target.value)} />
            <Input label="跳转链接" placeholder="https://..." type="url" value={boUrl} onChange={e => setBoUrl(e.target.value)} />
            <Btn variant="primary" className="w-full" onClick={handleSendBtnOld}>
              <Check className="w-4 h-4" /> 提交
            </Btn>
          </div>
        </Modal>

        {/* Gen Dir */}
        <Modal open={modal === 'genDir'} onClose={() => setModal(null)} title="生成手动目录">
          <div className="space-y-4">
            <div>
              <Input label="频道 ID" placeholder="-100xxxxxxxxxx" value={gdCh} onChange={e => setGdCh(e.target.value)} />
              <ChannelPicker addressBook={ab} onSelect={setGdCh} />
            </div>
            <p className="text-xs text-text-tertiary">扫描可能需要较长时间，结果将发送到机器人对话中</p>
            <Btn variant="primary" className="w-full" onClick={handleGenDir}>
              <FolderTree className="w-4 h-4" /> 开始扫描
            </Btn>
          </div>
        </Modal>

        {/* Replace Tag */}
        <Modal open={modal === 'replace'} onClose={() => setModal(null)} title="批量替换标签">
          <div className="space-y-4">
            <div>
              <Input label="频道 ID" placeholder="-100xxxxxxxxxx" value={rpCh} onChange={e => setRpCh(e.target.value)} />
              <ChannelPicker addressBook={ab} onSelect={setRpCh} />
            </div>
            <Input label="旧标签 (带 #)" placeholder="#旧标签" value={rpOld} onChange={e => setRpOld(e.target.value)} />
            <Input label="新标签 (输入 delete 删除)" placeholder="#新标签" value={rpNew} onChange={e => setRpNew(e.target.value)} />
            <Btn variant="primary" className="w-full" onClick={handleReplaceTag}>
              <Replace className="w-4 h-4" /> 开始替换
            </Btn>
          </div>
        </Modal>

        {/* Backup */}
        <Modal open={modal === 'backup'} onClose={() => setModal(null)} title="智能备份">
          <div className="space-y-4">
            <div>
              <Input label="源频道 ID" placeholder="-100xxxxxxxxxx" value={bkSrc} onChange={e => setBkSrc(e.target.value)} />
              <ChannelPicker addressBook={ab} onSelect={setBkSrc} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">目标频道</label>
              {bkTgts.map((t, i) => (
                <div key={i}>
                  <input
                    className="w-full px-4 py-3 bg-surface-3 border border-white/[0.06] rounded-xl text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent/50 transition-all"
                    placeholder="-100xxxxxxxxxx"
                    value={t}
                    onChange={e => { const arr = [...bkTgts]; arr[i] = e.target.value; setBkTgts(arr) }}
                  />
                  <ChannelPicker addressBook={ab} onSelect={v => { const arr = [...bkTgts]; arr[i] = v; setBkTgts(arr) }} />
                </div>
              ))}
              <Btn variant="ghost" className="text-xs" onClick={() => setBkTgts([...bkTgts, ''])}>
                <Plus className="w-3 h-3" /> 添加目标
              </Btn>
            </div>
            <Input label="源频道最新消息链接" placeholder="https://t.me/..." value={bkLink} onChange={e => setBkLink(e.target.value)} />
            <div className="flex items-center justify-between p-4 bg-surface-3 rounded-xl border border-white/[0.06]">
              <div>
                <div className="text-sm font-semibold flex items-center gap-2"><Zap className="w-4 h-4 text-accent" /> 洗文件 MD5</div>
                <div className="text-[11px] text-text-tertiary mt-1">下载后修改哈希再重传</div>
              </div>
              <button
                onClick={() => setBkWash(!bkWash)}
                className={cn('w-12 h-7 rounded-full transition-colors relative', bkWash ? 'bg-accent' : 'bg-white/10')}
              >
                <motion.div
                  animate={{ x: bkWash ? 22 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-1 w-5 h-5 bg-white rounded-full shadow"
                />
              </button>
            </div>
            <Btn variant="primary" className="w-full" onClick={handleStartBackup}>
              <Rocket className="w-4 h-4" /> 开始备份
            </Btn>
          </div>
        </Modal>

        {/* Multi Buttons */}
        <Modal open={modal === 'btnMulti'} onClose={() => setModal(null)} title="多按钮消息">
          <div className="space-y-4">
            <div>
              <Input label="频道 ID" placeholder="-100xxxxxxxxxx" value={bmCh} onChange={e => setBmCh(e.target.value)} />
              <ChannelPicker addressBook={ab} onSelect={setBmCh} />
            </div>
            <TextArea label="消息正文 (支持 HTML)" rows={3} placeholder="消息内容..." value={bmText} onChange={e => setBmText(e.target.value)} />
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">按钮列表</label>
              {bmBtns.map((b, i) => (
                <div key={i} className="flex gap-2">
                  <input className="flex-1 px-3 py-2 bg-surface-3 border border-white/[0.06] rounded-xl text-sm text-text-primary outline-none" placeholder="按钮文字" value={b.text}
                    onChange={e => { const arr = [...bmBtns]; arr[i].text = e.target.value; setBmBtns(arr) }} />
                  <input className="flex-1 px-3 py-2 bg-surface-3 border border-white/[0.06] rounded-xl text-sm text-text-primary outline-none" placeholder="https://链接" value={b.url}
                    onChange={e => { const arr = [...bmBtns]; arr[i].url = e.target.value; setBmBtns(arr) }} />
                </div>
              ))}
              <Btn variant="ghost" className="text-xs" onClick={() => setBmBtns([...bmBtns, {text:'',url:''}])}>
                <Plus className="w-3 h-3" /> 添加按钮
              </Btn>
            </div>
            <Btn variant="primary" className="w-full" onClick={handleSendBtnMulti}>
              <Send className="w-4 h-4" /> 发送
            </Btn>
          </div>
        </Modal>

        {/* Batch Create */}
        <Modal open={modal === 'batchCreate'} onClose={() => setModal(null)} title="批量创建频道">
          <div className="space-y-4">
            <TextArea label="频道名称列表 (每行一个)" rows={5} placeholder={"频道A\n频道B\n频道C"} value={bcNames} onChange={e => setBcNames(e.target.value)} />
            <Input label="每个名称创建数量" type="number" value={bcCount} onChange={e => setBcCount(parseInt(e.target.value) || 1)} hint="数量1不加后缀，数量3则创建: 名1、名2、名3" />
            <Input label="自动拉入的用户/机器人 ID" placeholder="@your_bot 123456789" value={bcUsers} onChange={e => setBcUsers(e.target.value)} />
            <Btn variant="primary" className="w-full" onClick={handleBatchCreate}>
              <Building2 className="w-4 h-4" /> 开始创建
            </Btn>
          </div>
        </Modal>

        {/* Backup Members */}
        <Modal open={modal === 'backupMembers'} onClose={() => setModal(null)} title="备份频道成员">
          <div className="space-y-4">
            <div>
              <Input label="频道 / 群组 ID" placeholder="-100xxxxxxxxxx" value={bmChId} onChange={e => setBmChId(e.target.value)} />
              <ChannelPicker addressBook={ab} onSelect={setBmChId} />
            </div>
            <div className="text-xs text-text-tertiary space-y-1 p-4 bg-surface-3 rounded-xl border border-white/[0.06]">
              <p>将导出所有成员的 UserID、Username、昵称等信息为 CSV 文件</p>
              <p>文件将同时上传到 WebDAV 并发送到 Bot 对话</p>
            </div>
            <Btn variant="primary" className="w-full" onClick={handleBackupMembers}>
              <Users className="w-4 h-4" /> 开始导出
            </Btn>
          </div>
        </Modal>
      </div>
    </div>
  )
}
