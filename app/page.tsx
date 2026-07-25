"use client";

import {
  Activity,
  ArchiveRestore,
  ArrowUpRight,
  BarChart3,
  BellRing,
  BookMarked,
  Boxes,
  Check,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  ClipboardList,
  Cloud,
  Code2,
  Copy,
  FolderCog,
  FolderSync,
  Gauge,
  LayoutDashboard,
  Link2,
  ListFilter,
  LoaderCircle,
  Menu,
  MessageSquareText,
  PanelsTopLeft,
  Plus,
  Radio,
  RefreshCcw,
  Send,
  Settings2,
  Sparkles,
  Tags,
  Trash2,
  Upload,
  UsersRound,
  X,
  Zap
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  getTelegramInitData,
  getTelegramUser,
  initializeTelegramWebApp,
  type TelegramUser
} from "@/lib/telegram";


type Target = {
  channel_id: string;
  msg_id: string;
};

type Group = {
  name: string;
  src: string;
  tgt: string[] | string;
};

type StatTask = {
  task_name: string;
  channel_id: string;
  msg_id: string;
  table_title: string;
  top_n: number;
  trigger_tag: string;
  interval: number;
  duration: number;
  stats_blacklist: string[];
  blacklist_title: string;
};

type DirTask = {
  task_name: string;
  scan_id: string;
  targets: Target[];
  blacklist: string[];
  interval: number;
  tags_cache: string[];
};

type UserData = {
  groups: Group[];
  stats_tasks: StatTask[];
  dir_tasks: DirTask[];
  address_book: Record<string, string>;
};

type BackendData = {
  ok: boolean;
  user: UserData;
  msg_count: number;
  webdav_url: string;
  userbot: boolean;
  msg?: string;
};

type PageKey = "overview" | "sync" | "tools" | "tasks" | "channels";
type ModalKey =
  | "sync"
  | "channel"
  | "stat"
  | "dir"
  | "buttonNew"
  | "buttonOld"
  | "buttonMulti"
  | "backup"
  | "directory"
  | "replace"
  | "members"
  | "batch"
  | null;

const emptyUser: UserData = {
  groups: [],
  stats_tasks: [],
  dir_tasks: [],
  address_book: {}
};

const nav = [
  { key: "overview" as PageKey, label: "控制台", icon: LayoutDashboard },
  { key: "sync" as PageKey, label: "同步矩阵", icon: FolderSync },
  { key: "tools" as PageKey, label: "工具集", icon: Boxes },
  { key: "tasks" as PageKey, label: "自动任务", icon: Activity },
  { key: "channels" as PageKey, label: "频道簿", icon: BookMarked }
];

function getInitData() {
  return window.Telegram?.WebApp?.initData || "";
}

async function requestApi<T>(
  path: string,
  method = "GET",
  body?: unknown
): Promise<T> {
  const response = await fetch(`/backend${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Init-Data": getInitData()
    },
    body: body ? JSON.stringify(body) : undefined
  });

  return response.json() as Promise<T>;
}

async function uploadApi<T>(path: string, body: FormData): Promise<T> {
  const response = await fetch(`/backend${path}`, {
    method: "POST",
    headers: {
      "X-Init-Data": getInitData()
    },
    body
  });

  return response.json() as Promise<T>;
}

function useTelegram() {
  const [telegramUser, setTelegramUser] = useState<
    | { id: number; first_name: string; photo_url?: string }
    | undefined
  >();

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready();
    tg?.expand();
    tg?.enableClosingConfirmation();
    setTelegramUser(tg?.initDataUnsafe?.user);
  }, []);

  return telegramUser;
}

export default function Home() {
  const telegramUser = useTelegram();

  const [activePage, setActivePage] = useState<PageKey>("overview");
  const [activeTaskTab, setActiveTaskTab] = useState<"stats" | "dirs">("stats");
  const [data, setData] = useState<BackendData | null>(null);
  const [modal, setModal] = useState<ModalKey>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "ok" | "error" } | null>(
    null
  );

  const user = data?.user || emptyUser;

  const notify = (text: string, type: "ok" | "error" = "ok") => {
    setToast({ text, type });
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(type === "ok" ? "light" : "medium");
    window.setTimeout(() => setToast(null), 3200);
  };

  const refresh = async () => {
    setLoading(true);

    try {
      const result = await requestApi<BackendData>("/data");
      if (!result.ok) {
        throw new Error(result.msg || "无法读取数据");
      }
      setData(result);
    } catch (error) {
      notify(error instanceof Error ? error.message : "后端连接失败", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const updateFromResponse = (result: { ok: boolean; user?: UserData; msg?: string }) => {
    if (!result.ok) {
      notify(result.msg || "操作未完成", "error");
      return false;
    }

    if (result.user) {
      setData((prev) =>
        prev
          ? {
              ...prev,
              user: result.user!
            }
          : prev
      );
    }

    notify("操作已完成");
    return true;
  };

  const confirmAction = (message: string, action: () => void) => {
    const tg = window.Telegram?.WebApp;
    if (tg?.showConfirm) {
      tg.showConfirm(message, (ok) => ok && action());
      return;
    }

    if (window.confirm(message)) action();
  };

  const title = useMemo(
    () => nav.find((item) => item.key === activePage)?.label || "控制台",
    [activePage]
  );

  return (
    <main className="min-h-screen px-4 py-4 md:px-8 md:py-7">
      <AmbientOrbs />

      <div className="mx-auto grid max-w-[1600px] gap-5 lg:grid-cols-[244px_minmax(0,1fr)]">
        <aside className="glass hidden min-h-[calc(100vh-56px)] rounded-[28px] p-4 lg:flex lg:flex-col">
          <Brand />

          <nav className="mt-10 space-y-1">
            {nav.map((item) => (
              <NavButton
                key={item.key}
                active={activePage === item.key}
                icon={<item.icon size={18} strokeWidth={1.8} />}
                onClick={() => setActivePage(item.key)}
              >
                {item.label}
              </NavButton>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Radio
                className={data?.userbot ? "text-[#b6ff4d]" : "text-[#ff7464]"}
                size={15}
              />
              引擎状态
            </div>
            <p className="mt-3 text-lg font-medium tracking-tight">
              {data?.userbot ? "ONLINE" : "STANDBY"}
            </p>
            <p className="mt-1 font-mono text-[10px] text-zinc-500">
              TELETHON / CORE NODE
            </p>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="glass mb-5 flex items-center justify-between rounded-[26px] px-4 py-3 md:px-6">
            <div className="flex items-center gap-3">
              <button
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] lg:hidden"
                onClick={() => setMenuOpen(true)}
                aria-label="打开导航"
              >
                <Menu size={19} />
              </button>

              <div>
                <p className="font-mono text-[10px] tracking-[0.22em] text-[#b6ff4d]">
                  NINE7 / SYSTEM
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">
                  {title}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={refresh}
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] transition hover:bg-white/[0.09]"
                aria-label="刷新"
              >
                <RefreshCcw size={17} className={loading ? "animate-spin" : ""} />
              </button>

              <div className="hidden items-center gap-3 border-l border-white/10 pl-4 sm:flex">
                <div className="text-right">
                  <p className="max-w-32 truncate text-sm font-medium">
                    {telegramUser?.first_name || "访客模式"}
                  </p>
                  <p className="font-mono text-[10px] text-zinc-500">
                    {telegramUser ? `ID ${telegramUser.id}` : "TELEGRAM WEB APP"}
                  </p>
                </div>
                <Avatar user={telegramUser} />
              </div>
            </div>
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(8px)" }}
              transition={{ duration: 0.25 }}
            >
              {loading && !data ? (
                <LoadingScreen />
              ) : (
                <>
                  {activePage === "overview" && (
                    <Overview data={data} user={user} onNavigate={setActivePage} />
                  )}

                  {activePage === "sync" && (
                    <SyncPage
                      groups={user.groups}
                      channels={user.address_book}
                      openCreate={() => setModal("sync")}
                      remove={async (index) => {
                        confirmAction("确认移除这个同步组？", async () => {
                          const result = await requestApi<{ ok: boolean; user?: UserData }>(
                            `/groups/${index}`,
                            "DELETE"
                          );
                          if (updateFromResponse(result)) refresh();
                        });
                      }}
                    />
                  )}

                  {activePage === "tools" && (
                    <ToolsPage openModal={setModal} />
                  )}

                  {activePage === "tasks" && (
                    <TasksPage
                      tab={activeTaskTab}
                      setTab={setActiveTaskTab}
                      stats={user.stats_tasks}
                      dirs={user.dir_tasks}
                      channels={user.address_book}
                      openCreate={() =>
                        setModal(activeTaskTab === "stats" ? "stat" : "dir")
                      }
                      removeStat={(index) =>
                        confirmAction("确认删除此统计任务？", async () => {
                          const result = await requestApi<{ ok: boolean; user?: UserData }>(
                            `/stats/${index}`,
                            "DELETE"
                          );
                          if (updateFromResponse(result)) refresh();
                        })
                      }
                      removeDir={(index) =>
                        confirmAction("确认删除此目录任务？", async () => {
                          const result = await requestApi<{ ok: boolean; user?: UserData }>(
                            `/dirs/${index}`,
                            "DELETE"
                          );
                          if (updateFromResponse(result)) refresh();
                        })
                      }
                    />
                  )}

                  {activePage === "channels" && (
                    <ChannelsPage
                      channels={user.address_book}
                      openCreate={() => setModal("channel")}
                      remove={(id) =>
                        confirmAction("确认从频道簿删除该频道？", async () => {
                          const result = await requestApi<{ ok: boolean; user?: UserData }>(
                            `/channels/${encodeURIComponent(id)}`,
                            "DELETE"
                          );
                          if (updateFromResponse(result)) refresh();
                        })
                      }
                    />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>

      <MobileNav active={activePage} onChange={setActivePage} />

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/70 p-4 backdrop-blur-md lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="glass h-full max-w-sm rounded-[28px] p-4"
              initial={{ x: -80 }}
              animate={{ x: 0 }}
              exit={{ x: -80 }}
            >
              <div className="flex items-center justify-between">
                <Brand />
                <button
                  className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.05]"
                  onClick={() => setMenuOpen(false)}
                >
                  <X size={19} />
                </button>
              </div>

              <nav className="mt-10 space-y-1">
                {nav.map((item) => (
                  <NavButton
                    key={item.key}
                    active={activePage === item.key}
                    icon={<item.icon size={18} />}
                    onClick={() => {
                      setActivePage(item.key);
                      setMenuOpen(false);
                    }}
                  >
                    {item.label}
                  </NavButton>
                ))}
              </nav>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast type={toast.type}>{toast.text}</Toast>}
      </AnimatePresence>

      <Modal open={modal === "sync"} onClose={() => setModal(null)} title="新建同步组">
        <SyncForm
          channels={user.address_book}
          onSubmit={async (payload) => {
            const result = await requestApi<{ ok: boolean; user?: UserData; msg?: string }>(
              "/groups",
              "POST",
              payload
            );
            if (updateFromResponse(result)) {
              setModal(null);
              refresh();
            }
          }}
        />
      </Modal>

      <Modal open={modal === "channel"} onClose={() => setModal(null)} title="收录频道">
        <ChannelForm
          onSubmit={async (payload) => {
            const result = await requestApi<{ ok: boolean; user?: UserData; msg?: string }>(
              "/channels",
              "POST",
              payload
            );
            if (updateFromResponse(result)) {
              setModal(null);
              refresh();
            }
          }}
        />
      </Modal>

      <Modal open={modal === "stat"} onClose={() => setModal(null)} title="创建统计任务">
        <StatForm
          channels={user.address_book}
          onSubmit={async (payload) => {
            const result = await requestApi<{ ok: boolean; user?: UserData; msg?: string }>(
              "/stats",
              "POST",
              payload
            );
            if (updateFromResponse(result)) {
              setModal(null);
              refresh();
            }
          }}
        />
      </Modal>

      <Modal open={modal === "dir"} onClose={() => setModal(null)} title="创建目录任务">
        <DirectoryTaskForm
          channels={user.address_book}
          onSubmit={async (payload) => {
            const result = await requestApi<{ ok: boolean; user?: UserData; msg?: string }>(
              "/dirs",
              "POST",
              payload
            );
            if (updateFromResponse(result)) {
              setModal(null);
              refresh();
            }
          }}
        />
      </Modal>

      <Modal open={modal === "buttonNew"} onClose={() => setModal(null)} title="发送按钮消息">
        <ButtonNewForm
          channels={user.address_book}
          onSubmit={async (form, hasMedia) => {
            const result = hasMedia
              ? await uploadApi<{ ok: boolean; msg?: string }>("/btn_new_media", form as FormData)
              : await requestApi<{ ok: boolean; msg?: string }>(
                  "/btn_new",
                  "POST",
                  form as Record<string, string>
                );

            if (!result.ok) {
              notify(result.msg || "发送失败", "error");
              return;
            }

            notify("消息已发送");
            setModal(null);
          }}
        />
      </Modal>

      <Modal open={modal === "buttonOld"} onClose={() => setModal(null)} title="修改旧消息按钮">
        <OldButtonForm
          channels={user.address_book}
          onSubmit={async (payload) => {
            const result = await requestApi<{ ok: boolean; msg?: string }>(
              "/btn_old",
              "POST",
              payload
            );
            if (!result.ok) return notify(result.msg || "操作失败", "error");
            notify("操作已完成");
            setModal(null);
          }}
        />
      </Modal>

      <Modal open={modal === "buttonMulti"} onClose={() => setModal(null)} title="发送多按钮消息">
        <MultiButtonForm
          channels={user.address_book}
          onSubmit={async (payload) => {
            const result = await requestApi<{ ok: boolean; msg?: string }>(
              "/btn_multi",
              "POST",
              payload
            );
            if (!result.ok) return notify(result.msg || "发送失败", "error");
            notify("消息已发送");
            setModal(null);
          }}
        />
      </Modal>

      <Modal open={modal === "backup"} onClose={() => setModal(null)} title="智能备份">
        <BackupForm
          channels={user.address_book}
          groups={user.groups}
          onSubmit={async (payload) => {
            const result = await requestApi<{ ok: boolean; msg?: string }>(
              "/backup",
              "POST",
              payload
            );
            if (!result.ok) return notify(result.msg || "任务启动失败", "error");
            notify("备份任务已提交，请在机器人会话查看进度");
            setModal(null);
          }}
        />
      </Modal>

      <Modal open={modal === "directory"} onClose={() => setModal(null)} title="生成手动目录">
        <SingleChannelActionForm
          channels={user.address_book}
          label="扫描频道"
          buttonText="开始扫描"
          icon={<FolderCog size={17} />}
          onSubmit={async (channelId) => {
            const result = await requestApi<{ ok: boolean; msg?: string }>(
              "/gen_dir",
              "POST",
              { ch_id: channelId }
            );
            if (!result.ok) return notify(result.msg || "任务启动失败", "error");
            notify("扫描任务已启动，请在机器人会话查看结果");
            setModal(null);
          }}
        />
      </Modal>

      <Modal open={modal === "replace"} onClose={() => setModal(null)} title="批量替换标签">
        <ReplaceTagForm
          channels={user.address_book}
          onSubmit={async (payload) => {
            const result = await requestApi<{ ok: boolean; msg?: string }>(
              "/replace_tag",
              "POST",
              payload
            );
            if (!result.ok) return notify(result.msg || "任务启动失败", "error");
            notify("替换任务已提交，请在机器人会话查看结果");
            setModal(null);
          }}
        />
      </Modal>

      <Modal open={modal === "members"} onClose={() => setModal(null)} title="导出频道成员">
        <SingleChannelActionForm
          channels={user.address_book}
          label="频道或群组"
          buttonText="开始导出"
          icon={<UsersRound size={17} />}
          onSubmit={async (channelId) => {
            const result = await requestApi<{ ok: boolean; msg?: string }>(
              "/backup_members",
              "POST",
              { ch_id: channelId }
            );
            if (!result.ok) return notify(result.msg || "任务启动失败", "error");
            notify("导出任务已提交，请在机器人会话接收文件");
            setModal(null);
          }}
        />
      </Modal>

      <Modal open={modal === "batch"} onClose={() => setModal(null)} title="批量创建频道">
        <BatchCreateForm
          onSubmit={async (payload) => {
            const result = await requestApi<{ ok: boolean; msg?: string }>(
              "/batch_create",
              "POST",
              payload
            );
            if (!result.ok) return notify(result.msg || "任务启动失败", "error");
            notify("批量创建任务已提交，请在机器人会话查看进度");
            setModal(null);
            refresh();
          }}
        />
      </Modal>
    </main>
  );
}

function AmbientOrbs() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-violet/15 blur-[100px]"
        animate={{ x: [0, 45, -10, 0], y: [0, 25, 42, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-signal/10 blur-[110px]"
        animate={{ x: [0, -60, 0], y: [0, 45, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-[#b6ff4d] text-black">
        <span className="font-mono text-sm font-black">N7</span>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20" />
      </div>
      <div>
        <p className="text-sm font-semibold tracking-tight">Nine7</p>
        <p className="font-mono text-[9px] tracking-[0.16em] text-zinc-500">
          CONTROL ROOM
        </p>
      </div>
    </div>
  );
}

function Avatar({
  user
}: {
  user?: { first_name: string; photo_url?: string };
}) {
  if (user?.photo_url) {
    return (
      <img
        src={user.photo_url}
        className="h-10 w-10 rounded-xl object-cover"
        alt={user.first_name}
      />
    );
  }

  return (
    <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet to-[#41316f] text-sm font-semibold">
      {user?.first_name?.slice(0, 1) || "N"}
    </div>
  );
}

function NavButton({
  active,
  icon,
  children,
  onClick
}: {
  active: boolean;
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition",
        active
          ? "bg-[#b6ff4d] text-black shadow-[0_8px_30px_rgba(182,255,77,0.17)]"
          : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"
      )}
    >
      {icon}
      <span className="font-medium">{children}</span>
      <ChevronRight
        size={15}
        className={clsx(
          "ml-auto transition-transform",
          active ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0 group-hover:opacity-60"
        )}
      />
    </button>
  );
}

function Overview({
  data,
  user,
  onNavigate
}: {
  data: BackendData | null;
  user: UserData;
  onNavigate: (page: PageKey) => void;
}) {
  const metrics = [
    { label: "同步矩阵", value: user.groups.length, icon: FolderSync, color: "text-[#b6ff4d]" },
    { label: "统计引擎", value: user.stats_tasks.length, icon: BarChart3, color: "text-[#9477ff]" },
    { label: "目录索引", value: user.dir_tasks.length, icon: ListFilter, color: "text-[#ff7464]" },
    {
      label: "频道节点",
      value: Object.keys(user.address_book).length,
      icon: BookMarked,
      color: "text-[#80caff]"
    }
  ];

  return (
    <div className="space-y-5 pb-24 lg:pb-0">
      <section className="glass relative overflow-hidden rounded-[28px] p-5 md:p-8">
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[#b6ff4d]/10 blur-[70px]" />

        <div className="relative grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#b6ff4d]">
              AUTOMATION OBSERVATORY
            </p>
            <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-[0.98] tracking-[-0.06em] md:text-6xl">
              频道系统，
              <br />
              保持有序运转。
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-zinc-400">
              集中处理跨频道同步、智能备份、数据榜单、标签目录与频道基础设施。
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <ActionButton icon={<FolderSync size={17} />} onClick={() => onNavigate("sync")}>
                管理同步
              </ActionButton>
              <ActionButton
                variant="ghost"
                icon={<Boxes size={17} />}
                onClick={() => onNavigate("tools")}
              >
                打开工具集
              </ActionButton>
            </div>
          </div>

          <div className="relative min-h-[240px] overflow-hidden rounded-[24px] border border-white/10 bg-black/20 p-5">
            <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(#b6ff4d_1px,transparent_1px)] [background-size:18px_18px]" />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-zinc-500">SYSTEM PULSE</span>
                <span
                  className={clsx(
                    "flex items-center gap-2 text-xs",
                    data?.userbot ? "text-[#b6ff4d]" : "text-[#ff7464]"
                  )}
                >
                  <span className="h-2 w-2 rounded-full bg-current shadow-[0_0_18px_currentColor]" />
                  {data?.userbot ? "引擎在线" : "引擎离线"}
                </span>
              </div>

              <div className="relative mx-auto grid h-32 w-32 place-items-center rounded-full border border-[#b6ff4d]/30 bg-[#b6ff4d]/5">
                <motion.div
                  className="absolute inset-[-12px] rounded-full border border-dashed border-[#b6ff4d]/30"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                />
                <Gauge size={43} className="text-[#b6ff4d]" strokeWidth={1.2} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MiniSignal label="消息映射" value={data?.msg_count || 0} />
                <MiniSignal label="运行节点" value={data?.userbot ? "01" : "00"} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            className="glass sheen rounded-[22px] p-5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
          >
            <metric.icon size={19} className={metric.color} strokeWidth={1.6} />
            <p className="mt-8 font-mono text-4xl tracking-[-0.08em]">{metric.value}</p>
            <p className="mt-2 text-xs text-zinc-500">{metric.label}</p>
          </motion.div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="glass rounded-[26px] p-5 md:p-6">
          <SectionTitle
            eyebrow="NETWORK SUMMARY"
            title="系统节点概览"
            action={<Activity size={18} className="text-[#b6ff4d]" />}
          />

          <div className="mt-6 space-y-3">
            <StatusLine icon={<Cloud size={17} />} label="云端数据节点" value={data?.webdav_url || "未配置"} />
            <StatusLine
              icon={<Radio size={17} />}
              label="Userbot 后台引擎"
              value={data?.userbot ? "连接正常" : "等待连接"}
              success={Boolean(data?.userbot)}
            />
            <StatusLine
              icon={<Link2 size={17} />}
              label="消息映射索引"
              value={`${data?.msg_count || 0} 条已建立`}
              success
            />
          </div>
        </div>

        <div className="glass rounded-[26px] p-5 md:p-6">
          <SectionTitle eyebrow="SHORTCUTS" title="快速入口" />
          <div className="mt-6 space-y-2">
            <QuickLink icon={<ArchiveRestore size={17} />} label="发起智能备份" onClick={() => onNavigate("tools")} />
            <QuickLink icon={<Tags size={17} />} label="管理自动任务" onClick={() => onNavigate("tasks")} />
            <QuickLink icon={<BookMarked size={17} />} label="更新频道地址簿" onClick={() => onNavigate("channels")} />
          </div>
        </div>
      </section>
    </div>
  );
}

function SyncPage({
  groups,
  channels,
  openCreate,
  remove
}: {
  groups: Group[];
  channels: Record<string, string>;
  openCreate: () => void;
  remove: (index: number) => void;
}) {
  return (
    <PagePanel
      eyebrow="MESSAGE ROUTING"
      title="同步矩阵"
      description="定义来源频道与一个或多个目标频道之间的自动转发路径。"
      action={
        <ActionButton icon={<Plus size={17} />} onClick={openCreate}>
          新建同步组
        </ActionButton>
      }
    >
      {!groups.length ? (
        <EmptyState icon={<FolderSync size={34} />} title="尚未建立同步路径" description="创建首个同步组，开始让消息自动流转。" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {groups.map((group, index) => {
            const targets = Array.isArray(group.tgt) ? group.tgt : [group.tgt];

            return (
              <motion.article
                key={`${group.src}-${index}`}
                className="glass sheen rounded-[24px] p-5"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.16em] text-[#b6ff4d]">
                      ROUTE {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-2 text-lg font-medium">
                      {group.name || `同步组 ${index + 1}`}
                    </h3>
                  </div>
                  <button
                    onClick={() => remove(index)}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-zinc-500 transition hover:border-[#ff7464]/40 hover:bg-[#ff7464]/10 hover:text-[#ff7464]"
                    aria-label="删除同步组"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mt-7 grid gap-3">
                  <ChannelNode label="来源" id={group.src} channels={channels} active />
                  <div className="ml-6 h-5 border-l border-dashed border-white/20" />
                  {targets.map((target, targetIndex) => (
                    <ChannelNode
                      key={`${target}-${targetIndex}`}
                      label={`目标 ${targetIndex + 1}`}
                      id={target}
                      channels={channels}
                    />
                  ))}
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </PagePanel>
  );
}

function ToolsPage({
  openModal
}: {
  openModal: (modal: ModalKey) => void;
}) {
  const tools = [
    {
      title: "发送按钮消息",
      desc: "文本、媒体、格式化内容与单个跳转按钮。",
      icon: Send,
      color: "from-[#b6ff4d]/25 to-transparent",
      modal: "buttonNew" as ModalKey
    },
    {
      title: "修改旧消息按钮",
      desc: "为既有消息增加、更新或清除链接按钮。",
      icon: MessageSquareText,
      color: "from-[#9477ff]/25 to-transparent",
      modal: "buttonOld" as ModalKey
    },
    {
      title: "多按钮消息",
      desc: "创建含多个独立跳转入口的频道消息。",
      icon: PanelsTopLeft,
      color: "from-[#80caff]/25 to-transparent",
      modal: "buttonMulti" as ModalKey
    },
    {
      title: "智能备份",
      desc: "跨频道复制历史内容，并支持文件指纹处理。",
      icon: ArchiveRestore,
      color: "from-[#ff7464]/25 to-transparent",
      modal: "backup" as ModalKey
    },
    {
      title: "生成标签目录",
      desc: "扫描历史消息，生成按首字母聚合的目录。",
      icon: FolderCog,
      color: "from-[#b6ff4d]/25 to-transparent",
      modal: "directory" as ModalKey
    },
    {
      title: "批量替换标签",
      desc: "在指定频道中批量替换或删除标签文本。",
      icon: Tags,
      color: "from-[#9477ff]/25 to-transparent",
      modal: "replace" as ModalKey
    },
    {
      title: "导出频道成员",
      desc: "导出成员资料为 CSV，并同步上传数据节点。",
      icon: UsersRound,
      color: "from-[#80caff]/25 to-transparent",
      modal: "members" as ModalKey
    },
    {
      title: "批量创建频道",
      desc: "基于名称列表自动创建频道与配置管理员。",
      icon: Copy,
      color: "from-[#ff7464]/25 to-transparent",
      modal: "batch" as ModalKey
    }
  ];

  return (
    <PagePanel
      eyebrow="UTILITY MODULES"
      title="工具集"
      description="独立执行频道级操作。耗时任务会在机器人私聊中回传结果。"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tools.map((tool, index) => (
          <motion.button
            key={tool.title}
            onClick={() => openModal(tool.modal)}
            className={clsx(
              "sheen glass group relative min-h-64 overflow-hidden rounded-[24px] p-5 text-left transition hover:-translate-y-1",
              index === 0 && "xl:col-span-2"
            )}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.045 }}
          >
            <div className={clsx("absolute inset-0 bg-gradient-to-br opacity-70", tool.color)} />
            <div className="relative flex h-full flex-col">
              <div className="flex items-start justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-black/20">
                  <tool.icon size={21} strokeWidth={1.5} />
                </div>
                <ArrowUpRight
                  size={18}
                  className="text-zinc-500 transition group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-white"
                />
              </div>
              <div className="mt-auto">
                <h3 className="text-lg font-medium tracking-tight">{tool.title}</h3>
                <p className="mt-2 max-w-sm text-xs leading-6 text-zinc-400">{tool.desc}</p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </PagePanel>
  );
}

function TasksPage({
  tab,
  setTab,
  stats,
  dirs,
  channels,
  openCreate,
  removeStat,
  removeDir
}: {
  tab: "stats" | "dirs";
  setTab: (tab: "stats" | "dirs") => void;
  stats: StatTask[];
  dirs: DirTask[];
  channels: Record<string, string>;
  openCreate: () => void;
  removeStat: (index: number) => void;
  removeDir: (index: number) => void;
}) {
  return (
    <PagePanel
      eyebrow="AUTOMATION PIPELINES"
      title="自动任务"
      description="配置持续运行的数据统计与频道标签目录任务。"
      action={
        <ActionButton icon={<Plus size={17} />} onClick={openCreate}>
          创建任务
        </ActionButton>
      }
    >
      <div className="mb-6 flex w-fit rounded-2xl border border-white/10 bg-black/20 p-1">
        <TabButton active={tab === "stats"} onClick={() => setTab("stats")}>
          <BarChart3 size={15} />
          统计任务
          <span>{stats.length}</span>
        </TabButton>
        <TabButton active={tab === "dirs"} onClick={() => setTab("dirs")}>
          <ListFilter size={15} />
          目录任务
          <span>{dirs.length}</span>
        </TabButton>
      </div>

      {tab === "stats" &&
        (!stats.length ? (
          <EmptyState icon={<BarChart3 size={34} />} title="暂无统计任务" description="创建统计任务，自动生成热评与互动榜单。" />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {stats.map((task, index) => (
              <article key={`${task.channel_id}-${task.msg_id}-${index}`} className="glass rounded-[24px] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.16em] text-[#9477ff]">
                      STAT ENGINE {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-2 text-lg font-medium">{task.task_name || "未命名统计"}</h3>
                  </div>
                  <button
                    onClick={() => removeStat(index)}
                    className="rounded-xl p-2 text-zinc-500 transition hover:bg-[#ff7464]/10 hover:text-[#ff7464]"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <DataCell label="更新频率" value={`${task.interval || 15} 分钟`} />
                  <DataCell label="榜单名额" value={`前 ${task.top_n || 10} 名`} />
                  <DataCell label="存活期限" value={`${task.duration || 7} 天`} />
                  <DataCell label="触发标签" value={task.trigger_tag || "未设置"} mono />
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-black/15 p-3 text-xs text-zinc-400">
                  <p>频道：{channelName(task.channel_id, channels)}</p>
                  <p className="mt-2">消息：<span className="font-mono text-zinc-300">{task.msg_id}</span></p>
                  <p className="mt-2">屏蔽名单：{task.stats_blacklist?.length || 0} 项</p>
                </div>
              </article>
            ))}
          </div>
        ))}

      {tab === "dirs" &&
        (!dirs.length ? (
          <EmptyState icon={<ListFilter size={34} />} title="暂无目录任务" description="建立自动目录，持续收集频道中的有效标签。" />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {dirs.map((task, index) => (
              <article key={`${task.scan_id}-${index}`} className="glass rounded-[24px] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.16em] text-[#b6ff4d]">
                      DIRECTORY {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-2 text-lg font-medium">{task.task_name || "未命名目录"}</h3>
                  </div>
                  <button
                    onClick={() => removeDir(index)}
                    className="rounded-xl p-2 text-zinc-500 transition hover:bg-[#ff7464]/10 hover:text-[#ff7464]"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <DataCell label="扫描频率" value={`${task.interval || 15} 分钟`} />
                  <DataCell label="已收录标签" value={`${task.tags_cache?.length || 0} 个`} />
                  <DataCell label="发布目标" value={`${task.targets?.length || 0} 个`} />
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-black/15 p-3 text-xs text-zinc-400">
                  <p>扫描源：{channelName(task.scan_id, channels)}</p>
                  <p className="mt-2">屏蔽标签：{task.blacklist?.join("、") || "无"}</p>
                </div>
              </article>
            ))}
          </div>
        ))}
    </PagePanel>
  );
}

function ChannelsPage({
  channels,
  openCreate,
  remove
}: {
  channels: Record<string, string>;
  openCreate: () => void;
  remove: (id: string) => void;
}) {
  const entries = Object.entries(channels);

  return (
    <PagePanel
      eyebrow="CHANNEL REGISTRY"
      title="频道簿"
      description="保存常用频道节点，在各类任务中快速选择。"
      action={
        <ActionButton icon={<Plus size={17} />} onClick={openCreate}>
          收录频道
        </ActionButton>
      }
    >
      {!entries.length ? (
        <EmptyState icon={<BookMarked size={34} />} title="频道簿为空" description="收录频道 ID 后，可在全部表单内快速调用。" />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {entries.map(([id, name], index) => (
            <motion.div
              key={id}
              className="glass flex items-center justify-between rounded-[20px] p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.035 }}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#b6ff4d]/10 text-[#b6ff4d]">
                  <BookMarked size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{name}</p>
                  <p className="mt-1 truncate font-mono text-[10px] text-zinc-500">{id}</p>
                </div>
              </div>
              <button
                onClick={() => remove(id)}
                className="rounded-xl p-2 text-zinc-500 transition hover:bg-[#ff7464]/10 hover:text-[#ff7464]"
              >
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </PagePanel>
  );
}

function PagePanel({
  eyebrow,
  title,
  description,
  action,
  children
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="pb-24 lg:pb-0">
      <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#b6ff4d]">{eyebrow}</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-[-0.06em] md:text-5xl">{title}</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-400">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SectionTitle({
  eyebrow,
  title,
  action
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <p className="font-mono text-[10px] tracking-[0.17em] text-zinc-500">{eyebrow}</p>
        <h3 className="mt-2 text-lg font-medium">{title}</h3>
      </div>
      {action}
    </div>
  );
}

function ActionButton({
  children,
  icon,
  onClick,
  type = "button",
  variant = "primary"
}: {
  children: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "ghost";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition active:scale-[0.98]",
        variant === "primary"
          ? "bg-[#b6ff4d] text-black shadow-[0_10px_35px_rgba(182,255,77,0.12)] hover:bg-[#ceff85]"
          : "border border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.09]"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function StatusLine({
  icon,
  label,
  value,
  success
}: {
  icon: ReactNode;
  label: string;
  value: string;
  success?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
      <div className={success ? "text-[#b6ff4d]" : "text-zinc-400"}>{icon}</div>
      <p className="min-w-0 flex-1 text-xs text-zinc-400">{label}</p>
      <p className="max-w-[45%] truncate text-right font-mono text-[10px] text-zinc-300">{value}</p>
    </div>
  );
}

function MiniSignal({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="font-mono text-lg tracking-[-0.08em]">{value}</p>
      <p className="mt-1 text-[10px] text-zinc-500">{label}</p>
    </div>
  );
}

function QuickLink({
  icon,
  label,
  onClick
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-left transition hover:bg-white/[0.07]"
    >
      <span className="text-[#b6ff4d]">{icon}</span>
      <span className="flex-1 text-sm text-zinc-300">{label}</span>
      <ChevronRight size={16} className="text-zinc-600 transition group-hover:translate-x-1" />
    </button>
  );
}

function ChannelNode({
  label,
  id,
  channels,
  active
}: {
  label: string;
  id: string;
  channels: Record<string, string>;
  active?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <span
        className={clsx(
          "h-2.5 w-2.5 rounded-full",
          active ? "bg-[#b6ff4d] shadow-[0_0_12px_#b6ff4d]" : "bg-[#9477ff]"
        )}
      />
      <div className="min-w-0">
        <p className="text-[11px] text-zinc-500">{label}</p>
        <p className="mt-0.5 truncate text-sm">{channelName(id, channels)}</p>
      </div>
    </div>
  );
}

function DataCell({
  label,
  value,
  mono
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/15 p-3">
      <p className="text-[10px] text-zinc-500">{label}</p>
      <p className={clsx("mt-2 truncate text-sm text-zinc-200", mono && "font-mono")}>{value}</p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="glass grid min-h-72 place-items-center rounded-[26px] p-8 text-center">
      <div>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-[#b6ff4d]">
          {icon}
        </div>
        <h3 className="mt-5 text-lg font-medium">{title}</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-500">{description}</p>
      </div>
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick
}: {
  children: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition",
        active ? "bg-white/[0.11] text-white" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {children}
    </button>
  );
}

function Modal({
  open,
  onClose,
  title,
  children
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-0 backdrop-blur-md md:items-center md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            className="glass max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[28px] p-5 md:rounded-[28px] md:p-7"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 310 }}
          >
            <div className="mb-7 flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] tracking-[0.18em] text-[#b6ff4d]">
                  COMMAND SHEET
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{title}</h2>
              </div>
              <button
                onClick={onClose}
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400 transition hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-zinc-300">{label}</span>
      {children}
      {hint && <span className="mt-2 block text-[11px] leading-5 text-zinc-500">{hint}</span>}
    </label>
  );
}

function ChannelPicker({
  channels,
  value,
  onChange,
  placeholder = "-100xxxxxxxxxx"
}: {
  channels: Record<string, string>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const items = Object.entries(channels);

  return (
    <div>
      <input
        className="input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      {!!items.length && (
        <div className="mt-2 flex flex-wrap gap-2">
          {items.map(([id, name]) => (
            <button
              type="button"
              key={id}
              onClick={() => onChange(id)}
              className={clsx(
                "rounded-lg border px-2.5 py-1.5 text-[11px] transition",
                value === id
                  ? "border-[#b6ff4d]/50 bg-[#b6ff4d]/10 text-[#b6ff4d]"
                  : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SyncForm({
  channels,
  onSubmit
}: {
  channels: Record<string, string>;
  onSubmit: (payload: { name: string; src: string; tgt: string[] }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [targets, setTargets] = useState([""]);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const filtered = targets.filter(Boolean);

    if (!source || !filtered.length) return;

    setSubmitting(true);
    await onSubmit({ name, src: source, tgt: filtered });
    setSubmitting(false);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="同步组名称">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：主频道分发" />
      </Field>

      <Field label="来源频道">
        <ChannelPicker channels={channels} value={source} onChange={setSource} />
      </Field>

      <Field label="目标频道">
        <div className="space-y-3">
          {targets.map((target, index) => (
            <div key={index} className="flex gap-2">
              <div className="min-w-0 flex-1">
                <ChannelPicker
                  channels={channels}
                  value={target}
                  onChange={(value) =>
                    setTargets((prev) => prev.map((item, i) => (i === index ? value : item)))
                  }
                />
              </div>
              {targets.length > 1 && (
                <button
                  type="button"
                  className="h-11 rounded-xl border border-white/10 px-3 text-zinc-400 hover:text-[#ff7464]"
                  onClick={() => setTargets((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </Field>

      <button
        type="button"
        className="flex items-center gap-2 text-xs text-[#b6ff4d]"
        onClick={() => setTargets((prev) => [...prev, ""])}
      >
        <Plus size={15} /> 添加目标频道
      </button>

      <ActionButton type="submit" icon={submitting ? <LoaderCircle className="animate-spin" size={17} /> : <FolderSync size={17} />}>
        创建同步路径
      </ActionButton>
    </form>
  );
}

function ChannelForm({
  onSubmit
}: {
  onSubmit: (payload: { id: string; name: string }) => Promise<void>;
}) {
  const [id, setId] = useState("");
  const [name, setName] = useState("");

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (id && name) await onSubmit({ id, name });
      }}
    >
      <Field label="频道 ID">
        <input className="input" value={id} onChange={(e) => setId(e.target.value)} placeholder="-100xxxxxxxxxx" />
      </Field>
      <Field label="频道备注">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：主频道" />
      </Field>
      <ActionButton type="submit" icon={<BookMarked size={17} />}>
        收录到频道簿
      </ActionButton>
    </form>
  );
}

function StatForm({
  channels,
  onSubmit
}: {
  channels: Record<string, string>;
  onSubmit: (payload: Record<string, string | number>) => Promise<void>;
}) {
  const [form, setForm] = useState({
    task_name: "",
    channel_id: "",
    msg_id: "",
    table_title: "",
    top_n: "10",
    trigger_tag: "#更新",
    interval: "15",
    duration: "7",
    stats_blacklist: "",
    blacklist_title: "本月轮换限制：",
    extract_from_msg: ""
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form
      className="grid gap-5 md:grid-cols-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!form.task_name || !form.channel_id || !form.msg_id || !form.trigger_tag.startsWith("#")) return;

        await onSubmit({
          ...form,
          top_n: Number(form.top_n) || 10,
          interval: Number(form.interval) || 15,
          duration: Number(form.duration) || 7
        });
      }}
    >
      <Field label="任务名称">
        <input className="input" value={form.task_name} onChange={(e) => set("task_name", e.target.value)} placeholder="例如：每日互动榜单" />
      </Field>
      <Field label="统计表标题">
        <input className="input" value={form.table_title} onChange={(e) => set("table_title", e.target.value)} placeholder="例如：互动热评榜" />
      </Field>

      <Field label="频道 ID">
        <ChannelPicker channels={channels} value={form.channel_id} onChange={(v) => set("channel_id", v)} />
      </Field>
      <Field label="承载消息 ID 或链接">
        <input className="input" value={form.msg_id} onChange={(e) => set("msg_id", e.target.value)} placeholder="311 或消息链接" />
      </Field>

      <Field label="显示名额">
        <input className="input" type="number" min="1" value={form.top_n} onChange={(e) => set("top_n", e.target.value)} />
      </Field>
      <Field label="触发标签">
        <input className="input" value={form.trigger_tag} onChange={(e) => set("trigger_tag", e.target.value)} placeholder="#更新" />
      </Field>

      <Field label="更新频率（分钟）">
        <input className="input" type="number" min="1" value={form.interval} onChange={(e) => set("interval", e.target.value)} />
      </Field>
      <Field label="寿命期限（天）">
        <input className="input" type="number" min="1" value={form.duration} onChange={(e) => set("duration", e.target.value)} />
      </Field>

      <div className="md:col-span-2">
        <Field label="屏蔽名单" hint="多个名字以空格或换行分隔。">
          <input className="input" value={form.stats_blacklist} onChange={(e) => set("stats_blacklist", e.target.value)} placeholder="名字 A 名字 B" />
        </Field>
      </div>

      <Field label="屏蔽区标题">
        <input className="input" value={form.blacklist_title} onChange={(e) => set("blacklist_title", e.target.value)} />
      </Field>
      <Field label="提取上期榜单（可选）">
        <input className="input" value={form.extract_from_msg} onChange={(e) => set("extract_from_msg", e.target.value)} placeholder="消息 ID 或链接" />
      </Field>

      <div className="md:col-span-2">
        <ActionButton type="submit" icon={<BarChart3 size={17} />}>
          创建统计引擎
        </ActionButton>
      </div>
    </form>
  );
}

function DirectoryTaskForm({
  channels,
  onSubmit
}: {
  channels: Record<string, string>;
  onSubmit: (payload: {
    task_name: string;
    scan_id: string;
    targets: Target[];
    blacklist: string[];
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [scanId, setScanId] = useState("");
  const [blacklist, setBlacklist] = useState("");
  const [targets, setTargets] = useState<Target[]>([{ channel_id: "", msg_id: "" }]);

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const validTargets = targets.filter((item) => item.channel_id && item.msg_id);
        if (!name || !scanId || !validTargets.length) return;

        await onSubmit({
          task_name: name,
          scan_id: scanId,
          targets: validTargets,
          blacklist: blacklist.split(/\s+/).filter(Boolean)
        });
      }}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="任务名称">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：频道标签索引" />
        </Field>
        <Field label="扫描频道">
          <ChannelPicker channels={channels} value={scanId} onChange={setScanId} />
        </Field>
      </div>

      <div>
        <p className="mb-3 text-xs font-medium text-zinc-300">目录发布目标</p>
        <div className="space-y-3">
          {targets.map((target, index) => (
            <div key={index} className="rounded-2xl border border-white/10 bg-black/15 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#b6ff4d]">
                  TARGET {String(index + 1).padStart(2, "0")}
                </span>
                {targets.length > 1 && (
                  <button
                    type="button"
                    className="text-zinc-500 hover:text-[#ff7464]"
                    onClick={() => setTargets((prev) => prev.filter((_, i) => i !== index))}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <ChannelPicker
                  channels={channels}
                  value={target.channel_id}
                  onChange={(value) =>
                    setTargets((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, channel_id: value } : item
                      )
                    )
                  }
                />
                <input
                  className="input"
                  value={target.msg_id}
                  onChange={(e) =>
                    setTargets((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, msg_id: e.target.value } : item
                      )
                    )
                  }
                  placeholder="承载目录的消息 ID"
                />
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="mt-3 flex items-center gap-2 text-xs text-[#b6ff4d]"
          onClick={() => setTargets((prev) => [...prev, { channel_id: "", msg_id: "" }])}
        >
          <Plus size={15} /> 增加发布目标
        </button>
      </div>

      <Field label="屏蔽标签">
        <input className="input" value={blacklist} onChange={(e) => setBlacklist(e.target.value)} placeholder="#通知 #归档" />
      </Field>

      <ActionButton type="submit" icon={<ListFilter size={17} />}>
        创建目录任务
      </ActionButton>
    </form>
  );
}

function ButtonNewForm({
  channels,
  onSubmit
}: {
  channels: Record<string, string>;
  onSubmit: (
    form: FormData | Record<string, string>,
    hasMedia: boolean
  ) => Promise<void>;
}) {
  const [channelId, setChannelId] = useState("");
  const [text, setText] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const insertFormat = (tag: string) => {
    setText((prev) => `${prev}<${tag}>文本</${tag}>`);
  };

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!channelId || (!text && !file)) return;

        if (file) {
          const form = new FormData();
          form.append("ch_id", channelId);
          form.append("text", text);
          form.append("btn_text", buttonText);
          form.append("url", url);
          form.append("media", file);
          await onSubmit(form, true);
          return;
        }

        await onSubmit(
          {
            ch_id: channelId,
            text,
            btn_text: buttonText,
            url
          },
          false
        );
      }}
    >
      <Field label="目标频道">
        <ChannelPicker channels={channels} value={channelId} onChange={setChannelId} />
      </Field>

      <Field label="消息正文" hint="后端以 Telegram HTML 模式发送。">
        <div className="mb-2 flex flex-wrap gap-2">
          {[
            ["粗体", "b"],
            ["斜体", "i"],
            ["下划线", "u"],
            ["删除线", "s"],
            ["代码", "code"],
            ["引用", "blockquote"]
          ].map(([label, tag]) => (
            <button
              type="button"
              key={tag}
              onClick={() => insertFormat(tag)}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-zinc-300 hover:bg-white/[0.09]"
            >
              {label}
            </button>
          ))}
        </div>
        <textarea className="input min-h-36" value={text} onChange={(e) => setText(e.target.value)} placeholder="输入消息内容…" />
      </Field>

      <Field label="附加媒体（可选）">
        <input
          className="block w-full rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-3 text-xs text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-[#b6ff4d] file:px-3 file:py-2 file:text-xs file:font-medium file:text-black"
          type="file"
          accept="image/*,video/*,.gif"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="按钮文字（可选）">
          <input className="input" value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder="点击打开" />
        </Field>
        <Field label="跳转 URL（可选）">
          <input className="input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </Field>
      </div>

      <ActionButton type="submit" icon={<Send size={17} />}>
        发送到频道
      </ActionButton>
    </form>
  );
}

function OldButtonForm({
  channels,
  onSubmit
}: {
  channels: Record<string, string>;
  onSubmit: (payload: Record<string, string>) => Promise<void>;
}) {
  const [channelId, setChannelId] = useState("");
  const [msgId, setMsgId] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [url, setUrl] = useState("");

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!channelId || !msgId || !buttonText) return;
        await onSubmit({ ch_id: channelId, msg_id: msgId, btn_text: buttonText, url });
      }}
    >
      <Field label="频道">
        <ChannelPicker channels={channels} value={channelId} onChange={setChannelId} />
      </Field>
      <Field label="消息 ID 或消息链接">
        <input className="input" value={msgId} onChange={(e) => setMsgId(e.target.value)} placeholder="311 或消息链接" />
      </Field>
      <Field label="按钮文字" hint="填写“删除”可清除该消息全部按钮。">
        <input className="input" value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder="按钮文字或删除" />
      </Field>
      <Field label="跳转 URL">
        <input className="input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
      </Field>
      <ActionButton type="submit" icon={<Settings2 size={17} />}>
        更新消息按钮
      </ActionButton>
    </form>
  );
}

function MultiButtonForm({
  channels,
  onSubmit
}: {
  channels: Record<string, string>;
  onSubmit: (payload: { ch_id: string; text: string; buttons: { text: string; url: string }[] }) => Promise<void>;
}) {
  const [channelId, setChannelId] = useState("");
  const [text, setText] = useState("");
  const [buttons, setButtons] = useState([{ text: "", url: "" }]);

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const valid = buttons.filter((button) => button.text && button.url);
        if (!channelId || !text || !valid.length) return;
        await onSubmit({ ch_id: channelId, text, buttons: valid });
      }}
    >
      <Field label="目标频道">
        <ChannelPicker channels={channels} value={channelId} onChange={setChannelId} />
      </Field>
      <Field label="消息正文">
        <textarea className="input min-h-28" value={text} onChange={(e) => setText(e.target.value)} placeholder="支持 Telegram HTML 格式" />
      </Field>

      <div>
        <p className="mb-3 text-xs font-medium text-zinc-300">按钮列表</p>
        <div className="space-y-3">
          {buttons.map((button, index) => (
            <div key={index} className="flex gap-2">
              <input
                className="input"
                value={button.text}
                onChange={(e) =>
                  setButtons((prev) =>
                    prev.map((item, i) => (i === index ? { ...item, text: e.target.value } : item))
                  )
                }
                placeholder="按钮文字"
              />
              <input
                className="input"
                value={button.url}
                onChange={(e) =>
                  setButtons((prev) =>
                    prev.map((item, i) => (i === index ? { ...item, url: e.target.value } : item))
                  )
                }
                placeholder="https://…"
              />
              {buttons.length > 1 && (
                <button
                  type="button"
                  className="rounded-xl px-3 text-zinc-500 hover:text-[#ff7464]"
                  onClick={() => setButtons((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setButtons((prev) => [...prev, { text: "", url: "" }])}
          className="mt-3 flex items-center gap-2 text-xs text-[#b6ff4d]"
        >
          <Plus size={15} /> 添加按钮行
        </button>
      </div>

      <ActionButton type="submit" icon={<PanelsTopLeft size={17} />}>
        发送多按钮消息
      </ActionButton>
    </form>
  );
}

function BackupForm({
  channels,
  groups,
  onSubmit
}: {
  channels: Record<string, string>;
  groups: Group[];
  onSubmit: (payload: { src: string; tgt: string[]; link: string; wash: boolean }) => Promise<void>;
}) {
  const [source, setSource] = useState("");
  const [link, setLink] = useState("");
  const [targets, setTargets] = useState([""]);
  const [wash, setWash] = useState(false);

  const quickFill = (group: Group) => {
    setSource(group.src);
    setTargets(Array.isArray(group.tgt) ? group.tgt : [group.tgt]);
  };

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const valid = targets.filter(Boolean);
        if (!source || !link || !valid.length) return;
        await onSubmit({ src: source, tgt: valid, link, wash });
      }}
    >
      {!!groups.length && (
        <div>
          <p className="mb-2 text-xs text-zinc-500">快速使用同步组</p>
          <div className="flex flex-wrap gap-2">
            {groups.map((group, index) => (
              <button
                key={index}
                type="button"
                onClick={() => quickFill(group)}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-zinc-300 hover:border-[#b6ff4d]/40 hover:text-[#b6ff4d]"
              >
                {group.name || `同步组 ${index + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}

      <Field label="来源频道">
        <ChannelPicker channels={channels} value={source} onChange={setSource} />
      </Field>

      <Field label="最新消息链接" hint="系统将备份从历史起点至该消息为止的有效内容。">
        <input className="input" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://t.me/…" />
      </Field>

      <Field label="目标频道">
        <div className="space-y-3">
          {targets.map((target, index) => (
            <div className="flex gap-2" key={index}>
              <div className="min-w-0 flex-1">
                <ChannelPicker
                  channels={channels}
                  value={target}
                  onChange={(value) =>
                    setTargets((prev) => prev.map((item, i) => (i === index ? value : item)))
                  }
                />
              </div>
              {targets.length > 1 && (
                <button
                  type="button"
                  onClick={() => setTargets((prev) => prev.filter((_, i) => i !== index))}
                  className="rounded-xl px-3 text-zinc-500 hover:text-[#ff7464]"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </Field>

      <button
        type="button"
        onClick={() => setTargets((prev) => [...prev, ""])}
        className="flex items-center gap-2 text-xs text-[#b6ff4d]"
      >
        <Plus size={15} /> 添加目标频道
      </button>

      <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div>
          <p className="text-sm font-medium">文件指纹处理</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            下载、处理并重新上传媒体文件，执行速度会显著降低。
          </p>
        </div>
        <input
          type="checkbox"
          className="h-5 w-5 accent-[#b6ff4d]"
          checked={wash}
          onChange={(e) => setWash(e.target.checked)}
        />
      </label>

      <ActionButton type="submit" icon={<ArchiveRestore size={17} />}>
        发起备份任务
      </ActionButton>
    </form>
  );
}

function SingleChannelActionForm({
  channels,
  label,
  buttonText,
  icon,
  onSubmit
}: {
  channels: Record<string, string>;
  label: string;
  buttonText: string;
  icon: ReactNode;
  onSubmit: (channelId: string) => Promise<void>;
}) {
  const [channelId, setChannelId] = useState("");

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (channelId) await onSubmit(channelId);
      }}
    >
      <Field label={label}>
        <ChannelPicker channels={channels} value={channelId} onChange={setChannelId} />
      </Field>
      <div className="rounded-2xl border border-[#b6ff4d]/15 bg-[#b6ff4d]/[0.04] p-4 text-xs leading-6 text-zinc-400">
        操作将在后台执行，完成结果将发送至当前 Telegram 机器人会话。
      </div>
      <ActionButton type="submit" icon={icon}>
        {buttonText}
      </ActionButton>
    </form>
  );
}

function ReplaceTagForm({
  channels,
  onSubmit
}: {
  channels: Record<string, string>;
  onSubmit: (payload: { ch_id: string; old_tag: string; new_tag: string }) => Promise<void>;
}) {
  const [channelId, setChannelId] = useState("");
  const [oldTag, setOldTag] = useState("");
  const [newTag, setNewTag] = useState("");

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!channelId || !oldTag.startsWith("#")) return;
        await onSubmit({ ch_id: channelId, old_tag: oldTag, new_tag: newTag });
      }}
    >
      <Field label="目标频道">
        <ChannelPicker channels={channels} value={channelId} onChange={setChannelId} />
      </Field>
      <Field label="旧标签">
        <input className="input" value={oldTag} onChange={(e) => setOldTag(e.target.value)} placeholder="#旧标签" />
      </Field>
      <Field label="新标签">
        <input className="input" value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="#新标签；填写“删除”可移除" />
      </Field>
      <ActionButton type="submit" icon={<Tags size={17} />}>
        执行替换
      </ActionButton>
    </form>
  );
}

function BatchCreateForm({
  onSubmit
}: {
  onSubmit: (payload: { names: string; users: string; count: number }) => Promise<void>;
}) {
  const [names, setNames] = useState("");
  const [users, setUsers] = useState("");
  const [count, setCount] = useState("1");

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!names.trim()) return;
        await onSubmit({
          names,
          users,
          count: Math.max(1, Number(count) || 1)
        });
      }}
    >
      <Field label="频道名称列表" hint="每行一个频道名称。">
        <textarea className="input min-h-36" value={names} onChange={(e) => setNames(e.target.value)} placeholder={"频道名称 A\n频道名称 B\n频道名称 C"} />
      </Field>
      <Field label="每个名称创建数量">
        <input className="input" type="number" min="1" value={count} onChange={(e) => setCount(e.target.value)} />
      </Field>
      <Field label="自动添加管理员（可选）" hint="支持用户名、用户 ID；以空格、逗号或换行分隔。">
        <textarea className="input min-h-24" value={users} onChange={(e) => setUsers(e.target.value)} placeholder="@your_bot 123456789" />
      </Field>
      <ActionButton type="submit" icon={<Copy size={17} />}>
        提交批量创建
      </ActionButton>
    </form>
  );
}

function LoadingScreen() {
  return (
    <div className="glass grid min-h-[560px] place-items-center rounded-[28px]">
      <div className="text-center">
        <LoaderCircle className="mx-auto animate-spin text-[#b6ff4d]" size={32} />
        <p className="mt-4 font-mono text-xs tracking-[0.16em] text-zinc-500">
          CONNECTING TO CONTROL NODE
        </p>
      </div>
    </div>
  );
}

function Toast({
  type,
  children
}: {
  type: "ok" | "error";
  children: ReactNode;
}) {
  return (
    <motion.div
      className={clsx(
        "fixed bottom-24 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-xl lg:bottom-7",
        type === "ok"
          ? "border-[#b6ff4d]/30 bg-[#131b0a]/90 text-[#d9ffac]"
          : "border-[#ff7464]/30 bg-[#24110f]/90 text-[#ffb1a8]"
      )}
      initial={{ opacity: 0, y: 20, x: "-50%" }}
      animate={{ opacity: 1, y: 0, x: "-50%" }}
      exit={{ opacity: 0, y: 20, x: "-50%" }}
    >
      {type === "ok" ? <CircleCheck size={17} /> : <CircleAlert size={17} />}
      {children}
    </motion.div>
  );
}

function MobileNav({
  active,
  onChange
}: {
  active: PageKey;
  onChange: (key: PageKey) => void;
}) {
  return (
    <nav className="glass fixed bottom-4 left-4 right-4 z-40 flex rounded-2xl p-1.5 lg:hidden">
      {nav.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={clsx(
            "relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[9px] transition",
            active === item.key ? "text-black" : "text-zinc-500"
          )}
        >
          {active === item.key && (
            <motion.span
              layoutId="mobile-nav"
              className="absolute inset-0 rounded-xl bg-[#b6ff4d]"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <item.icon size={17} className="relative" />
          <span className="relative truncate">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function channelName(id: string, channels: Record<string, string>) {
  const name = channels[id] || channels[String(id)];
  return name ? `${name} (${id})` : id || "未设置";
}
