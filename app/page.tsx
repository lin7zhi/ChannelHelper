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
  MessageSquareText,
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

type MemberMonitor = {
  channel_id: string;
  started_at: number;
  interval: number;
  last_run: number;
  member_count: number;
  remote_path: string;
  last_error?: string;
};

type UserData = {
  groups: Group[];
  stats_tasks: StatTask[];
  dir_tasks: DirTask[];
  address_book: Record<string, string>;
  member_monitors: MemberMonitor[];
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
type EditTask =
  | { kind: "stat"; index: number; task: StatTask }
  | { kind: "dir"; index: number; task: DirTask }
  | null;

type ModalKey =
  | "sync"
  | "channel"
  | "stat"
  | "dir"
  | "buttonNew"
  | "buttonOld"
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
  address_book: {},
  member_monitors: []
};

const nav = [
  { key: "overview" as PageKey, label: "控制台", icon: LayoutDashboard },
  { key: "sync" as PageKey, label: "同步矩阵", icon: FolderSync },
  { key: "tools" as PageKey, label: "工具集", icon: Boxes },
  { key: "tasks" as PageKey, label: "自动任务", icon: Activity },
  { key: "channels" as PageKey, label: "频道簿", icon: BookMarked }
];

function getInitData() {
  return getTelegramInitData();
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
  const [telegramUser, setTelegramUser] = useState<TelegramUser | undefined>();
  const [telegramReady, setTelegramReady] = useState(false);

  useEffect(() => {
    let retryTimer: number | undefined;
    let retryCount = 0;

    const initialize = () => {
      const tg = initializeTelegramWebApp();

      if (tg) {
        setTelegramUser(getTelegramUser());
        setTelegramReady(true);

        if (!tg.initData) {
          console.warn(
            "Telegram WebApp 已加载，但 initData 为空。请确认页面是在 Telegram 内打开。"
          );
        }

        return;
      }

      retryCount += 1;

      if (retryCount < 30) {
        retryTimer = window.setTimeout(initialize, 100);
      } else {
        setTelegramReady(true);
        console.warn("未检测到 Telegram WebApp SDK。");
      }
    };

    initialize();

    return () => {
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
    };
  }, []);

  return {
    telegramUser,
    telegramReady,
    telegramInitData: getTelegramInitData()
  };
}

export default function Home() {
const {
  telegramUser,
  telegramReady,
  telegramInitData
} = useTelegram();


  const [activePage, setActivePage] = useState<PageKey>("overview");
  const [activeTaskTab, setActiveTaskTab] = useState<"stats" | "dirs">("stats");
  const [data, setData] = useState<BackendData | null>(null);
  const [modal, setModal] = useState<ModalKey>(null);
  const [editTask, setEditTask] = useState<EditTask>(null);
  const [editGroupIndex, setEditGroupIndex] = useState<number | null>(null);
  const [editChannelId, setEditChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ text: string; type: "ok" | "error" } | null>(
    null
  );

  const user = data?.user ? { ...emptyUser, ...data.user } : emptyUser;

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
  if (!telegramReady) {
    return;
  }

  refresh();
}, [telegramReady]);


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

  if (telegramReady && !telegramInitData) {
  return <TelegramOnlyScreen />;
}

return (
  <main className="relative min-h-screen px-3 pb-28 pt-3 sm:px-5 md:px-8 md:py-7">
      <AmbientOrbs />

      <div className="mx-auto grid max-w-[1560px] gap-4 lg:grid-cols-[220px_minmax(0,1fr)] xl:gap-8">
        <aside className="glass sticky top-7 hidden h-[calc(100vh-56px)] overflow-hidden rounded-[8px] p-4 lg:flex lg:flex-col">
          <div className="absolute -right-12 top-24 h-40 w-40 rotate-12 border border-[#c8ff45]/10" />
          <Brand />

          <p className="mt-12 font-mono text-[9px] tracking-[.28em] text-zinc-600">NAVIGATION / 05</p>
          <nav className="mt-4 space-y-1">
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

          <div className="relative mt-auto border-t border-white/10 pt-5">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Radio
                className={data?.userbot ? "text-[#b6ff4d]" : "text-[#ff7464]"}
                size={15}
              />
              引擎状态
            </div>
            <p className="mt-3 text-2xl font-light tracking-[-.06em]">
              {data?.userbot ? "ONLINE" : "STANDBY"}
            </p>
            <p className="mt-1 font-mono text-[10px] text-zinc-500">
              TELETHON / CORE NODE
            </p>
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden">
          <header className="mb-5 flex min-h-[64px] items-center justify-between border-b border-white/10 px-1 pb-3 pt-1 md:mb-8 md:min-h-[72px] md:px-0">
            <div className="flex shrink-0 items-center gap-3">
              <div>
                <p className="flex items-center gap-2 font-mono text-[9px] tracking-[0.24em] text-[#c8ff45]">
                  <span className="h-1.5 w-1.5 bg-current" /> LIVE CONTROL
                </p>
                <h1 className="mt-1 text-xl font-medium tracking-[-.04em] md:text-2xl">
                  {title}
                </h1>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                onClick={refresh}
                className="grid h-11 w-11 shrink-0 place-items-center border border-white/10 bg-white/[0.025] transition hover:border-[#c8ff45]/50 hover:text-[#c8ff45]"
                aria-label="刷新"
              >
                <RefreshCcw size={17} className={loading ? "animate-spin" : ""} />
              </button>

              <div className="flex min-w-0 items-center gap-2 border-l border-white/10 pl-2 sm:gap-3 sm:pl-4">
                <div className="hidden min-w-0 text-right xs:block sm:block">
                  <p className="max-w-24 truncate text-sm font-medium sm:max-w-32">
                    {telegramDisplayName(telegramUser)}
                  </p>
                  <p className="font-mono text-[10px] text-zinc-500">
                    {telegramUser?.username
                      ? `@${telegramUser.username}`
                      : telegramUser
                        ? `ID ${telegramUser.id}`
                        : "TELEGRAM WEB APP"}
                  </p>
                </div>
                <Avatar user={telegramUser} />
              </div>
            </div>
          </header>

          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={activePage}
              className="page-transition"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              {loading && !data ? (
                <LoadingScreen />
              ) : (
                <>
                  {activePage === "overview" && (
                    <Overview data={data} user={user} />
                  )}

                  {activePage === "sync" && (
                    <SyncPage
                      groups={user.groups}
                      channels={user.address_book}
                      openCreate={() => setModal("sync")}
                      edit={setEditGroupIndex}
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
                      openEdit={(kind, index) =>
                        setEditTask(
                          kind === "stat"
                            ? { kind, index, task: user.stats_tasks[index] }
                            : { kind, index, task: user.dir_tasks[index] }
                        )
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
                      edit={setEditChannelId}
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

      <Modal open={editGroupIndex !== null} onClose={() => setEditGroupIndex(null)} title="编辑同步组">
        {editGroupIndex !== null && user.groups[editGroupIndex] && (
          <SyncForm channels={user.address_book} initial={user.groups[editGroupIndex]} submitText="保存同步路径" onSubmit={async (payload) => {
            const result = await requestApi<{ ok: boolean; user?: UserData; msg?: string }>(`/groups/${editGroupIndex}`, "PUT", payload);
            if (updateFromResponse(result)) { setEditGroupIndex(null); refresh(); }
          }} />
        )}
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

      <Modal open={editChannelId !== null} onClose={() => setEditChannelId(null)} title="编辑频道">
        {editChannelId !== null && (
          <ChannelForm initial={{ id: editChannelId, name: user.address_book[editChannelId] || "" }} submitText="保存频道" onSubmit={async (payload) => {
            const result = await requestApi<{ ok: boolean; user?: UserData; msg?: string }>(`/channels/${encodeURIComponent(editChannelId)}`, "PUT", payload);
            if (updateFromResponse(result)) { setEditChannelId(null); refresh(); }
          }} />
        )}
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

      <Modal open={Boolean(editTask)} onClose={() => setEditTask(null)} title="编辑自动任务">
        {editTask && (
          <TaskEditForm
            kind={editTask.kind}
            task={editTask.task}
            channels={user.address_book}
            onSubmit={async (field, value) => {
              const endpoint = editTask.kind === "stat" ? `/stats/${editTask.index}` : `/dirs/${editTask.index}`;
              const result = await requestApi<{ ok: boolean; user?: UserData; msg?: string }>(
                endpoint,
                "PUT",
                { field, value }
              );
              if (updateFromResponse(result)) {
                setEditTask(null);
                refresh();
              }
            }}
          />
        )}
      </Modal>

      <Modal open={modal === "buttonNew"} onClose={() => setModal(null)} title="发送按钮消息">
        <ButtonMessageForm
          channels={user.address_book}
          onSubmit={async (form, hasMedia) => {
            const result = hasMedia
              ? await uploadApi<{ ok: boolean; msg?: string }>("/btn_multi", form as FormData)
              : await requestApi<{ ok: boolean; msg?: string }>(
                  "/btn_multi",
                  "POST",
                  form as { ch_id: string; text: string; buttons: { text: string; url: string }[] }
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
        <ButtonMessageForm
          channels={user.address_book}
          editMode
          onSubmit={async (form, hasMedia) => {
            const result = hasMedia
              ? await uploadApi<{ ok: boolean; msg?: string }>("/btn_old", form as FormData)
              : await requestApi<{ ok: boolean; msg?: string }>("/btn_old", "POST", form);
            if (!result.ok) return notify(result.msg || "操作失败", "error");
            notify("消息已更新");
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

      <Modal open={modal === "members"} onClose={() => setModal(null)} title="监控频道成员">
        <MemberMonitorForm
          channels={user.address_book}
          onSubmit={async (channelId, interval) => {
            const result = await requestApi<{ ok: boolean; msg?: string }>(
              "/member_monitors",
              "POST",
              { ch_id: channelId, interval }
            );
            if (!result.ok) return notify(result.msg || "任务启动失败", "error");
            notify("成员定时备份任务已创建");
            refresh();
          }}
        />
        {!!user.member_monitors.length && <div className="mt-5 space-y-2">
          {user.member_monitors.map((item) => <MemberMonitorCard key={item.channel_id} item={item} channels={user.address_book} notify={notify} refresh={refresh} updateFromResponse={updateFromResponse} />)}
        </div>}
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
        className="absolute -left-32 top-24 h-80 w-80 rounded-full bg-[#c8ff45]/10 blur-[120px]"
        animate={{ x: [0, 70, 0], y: [0, 35, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-[#63d8ff]/[0.06] blur-[140px]"
        animate={{ x: [0, -45, 0], y: [0, 60, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-11 w-11 place-items-center overflow-hidden bg-[#c8ff45] text-black [clip-path:polygon(0_0,82%_0,100%_18%,100%_100%,18%_100%,0_82%)]">
        <span className="font-mono text-sm font-black tracking-[-.12em]">N/7</span>
      </div>
      <div>
        <p className="text-sm font-semibold tracking-[-.03em]">Nine7</p>
        <p className="font-mono text-[9px] tracking-[0.16em] text-zinc-500">
          SIGNAL SYSTEM
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
        className="h-10 w-10 rounded-full object-cover ring-1 ring-white/15"
        alt={user.first_name}
      />
    );
  }

  return (
    <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#a58bff] to-[#423568] text-sm font-semibold ring-1 ring-white/15">
      {user?.first_name?.slice(0, 1) || "N"}
    </div>
  );
}

function telegramDisplayName(user?: TelegramUser) {
  if (!user) return "访客模式";

  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username || "Telegram 用户";
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
        "group relative flex min-h-11 w-full items-center gap-3 px-3 py-3 text-left text-sm transition",
        active
          ? "bg-[#c8ff45] text-black shadow-[0_12px_35px_rgba(200,255,69,0.12)]"
          : "text-zinc-500 hover:bg-white/[0.04] hover:text-white"
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
  user
}: {
  data: BackendData | null;
  user: UserData;
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
    <div className="space-y-4 pb-24 lg:space-y-6 lg:pb-0">
      <section className="glass relative min-h-[520px] overflow-hidden rounded-[8px] p-5 sm:min-h-[560px] md:p-9">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-[#c8ff45]/20" />
        <div className="absolute -right-2 top-0 h-full w-px bg-gradient-to-b from-transparent via-[#c8ff45]/30 to-transparent sm:right-12" />
        <div className="absolute bottom-0 right-0 select-none font-mono text-[34vw] font-black leading-none tracking-[-.14em] text-white/[0.018] sm:text-[15rem]">07</div>

        <div className="relative grid min-h-[470px] gap-8 xl:grid-cols-[1.15fr_.85fr]">
          <div className="flex flex-col">
            <p className="font-mono text-[10px] tracking-[0.2em] text-[#b6ff4d]">
              AUTOMATION / ORCHESTRATION / ARCHIVE
            </p>
            <h2 className="mt-5 max-w-4xl text-[clamp(3.25rem,13vw,7.8rem)] font-medium leading-[.78] tracking-[-.085em]">
              CONTROL<br/><span className="ml-[.42em] text-[#c8ff45]">FLOW.</span>
            </h2>
            <p className="mt-auto max-w-lg border-l border-[#c8ff45]/50 pl-4 text-sm leading-7 text-zinc-400">
              一个持续在线的频道操作系统。同步、备份、榜单与目录在同一条清晰的信号链中运行。
            </p>
          </div>

          <div className="relative min-h-[260px] overflow-hidden border border-white/10 bg-black/20 p-5">
            <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(200,255,69,.2)_1px,transparent_1px),linear-gradient(90deg,rgba(200,255,69,.2)_1px,transparent_1px)] [background-size:28px_28px]" />
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

              <div className="relative mx-auto grid h-32 w-32 place-items-center rounded-full border border-[#c8ff45]/30 bg-[#c8ff45]/5">
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

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            className="glass sheen rounded-[6px] p-5"
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

      <section>
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

      </section>
    </div>
  );
}

function SyncPage({
  groups,
  channels,
  openCreate,
  edit,
  remove
}: {
  groups: Group[];
  channels: Record<string, string>;
  openCreate: () => void;
  edit: (index: number) => void;
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
                  <div className="flex gap-1"><button onClick={() => edit(index)} className="grid h-9 w-9 place-items-center rounded-xl text-zinc-500 hover:bg-white/[0.08] hover:text-white" aria-label="编辑同步组"><Settings2 size={16} /></button><button
                    onClick={() => remove(index)}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-zinc-500 transition hover:border-[#ff7464]/40 hover:bg-[#ff7464]/10 hover:text-[#ff7464]"
                    aria-label="删除同步组"
                  >
                    <Trash2 size={16} />
                  </button></div>
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
      desc: "发送文本或媒体，可添加一个或多个跳转按钮。",
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
      title: "监控频道成员",
      desc: "持续记录监控开启后新加入频道或群组的成员。",
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
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {tools.map((tool, index) => (
          <motion.button
            key={tool.title}
            onClick={() => openModal(tool.modal)}
            className={clsx(
              "sheen glass tool-card group relative min-h-[158px] overflow-hidden rounded-[20px] p-3.5 text-left transition-[transform,background-color,border-color,color,box-shadow] duration-150 hover:-translate-y-1 sm:min-h-64 sm:rounded-[24px] sm:p-5",
              index === 0 && "col-span-2 xl:col-span-2"
            )}
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
  openEdit,
  removeStat,
  removeDir
}: {
  tab: "stats" | "dirs";
  setTab: (tab: "stats" | "dirs") => void;
  stats: StatTask[];
  dirs: DirTask[];
  channels: Record<string, string>;
  openCreate: () => void;
  openEdit: (kind: "stat" | "dir", index: number) => void;
  removeStat: (index: number) => void;
  removeDir: (index: number) => void;
}) {
  const [expandedBlacklist, setExpandedBlacklist] = useState<number | null>(null);
  const [expandedDirBlacklist, setExpandedDirBlacklist] = useState<number | null>(null);

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
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit("stat", index)}
                      className="rounded-xl p-2 text-zinc-500 transition hover:bg-white/[0.08] hover:text-white"
                      aria-label="编辑统计任务"
                    >
                      <Settings2 size={16} />
                    </button>
                    <button
                      onClick={() => removeStat(index)}
                    className="rounded-xl p-2 text-zinc-500 transition hover:bg-[#ff7464]/10 hover:text-[#ff7464]"
                  >
                    <Trash2 size={16} />
                    </button>
                  </div>
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
                  <button
                    type="button"
                    className="mt-2 flex w-full items-center justify-between text-left transition hover:text-white"
                    onClick={() =>
                      setExpandedBlacklist((current) => (current === index ? null : index))
                    }
                    aria-expanded={expandedBlacklist === index}
                  >
                    <span>屏蔽名单：{task.stats_blacklist?.length || 0} 项</span>
                    <ChevronRight
                      size={15}
                      className={clsx(
                        "transition-transform",
                        expandedBlacklist === index && "rotate-90"
                      )}
                    />
                  </button>
                  {expandedBlacklist === index && (
                    <div className="mt-3 border-t border-white/10 pt-3">
                      {task.stats_blacklist?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {task.stats_blacklist.map((name, blacklistIndex) => (
                            <span
                              key={`${name}-${blacklistIndex}`}
                              className="rounded-lg bg-[#9477ff]/10 px-2 py-1 text-xs text-[#d5c9ff]"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p>暂无屏蔽对象</p>
                      )}
                    </div>
                  )}
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
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit("dir", index)}
                      className="rounded-xl p-2 text-zinc-500 transition hover:bg-white/[0.08] hover:text-white"
                      aria-label="编辑目录任务"
                    >
                      <Settings2 size={16} />
                    </button>
                    <button
                      onClick={() => removeDir(index)}
                    className="rounded-xl p-2 text-zinc-500 transition hover:bg-[#ff7464]/10 hover:text-[#ff7464]"
                  >
                    <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <DataCell label="扫描频率" value={`${task.interval || 15} 分钟`} />
                  <DataCell label="已收录标签" value={`${task.tags_cache?.length || 0} 个`} />
                  <DataCell label="发布目标" value={`${task.targets?.length || 0} 个`} />
                  <DataCell label="屏蔽标签" value={`${task.blacklist?.length || 0} 个`} />
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-black/15 p-3 text-xs text-zinc-400">
                  <p>扫描源：{channelName(task.scan_id, channels)}</p>
                  <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                    <p className="text-zinc-500">发布目标</p>
                    {task.targets?.map((target, targetIndex) => (
                      <p key={`${target.channel_id}-${target.msg_id}-${targetIndex}`}>
                        {channelName(target.channel_id, channels)} · 消息 ID：<span className="font-mono text-zinc-200">{target.msg_id}</span>
                      </p>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="mt-2 flex w-full items-center justify-between text-left transition hover:text-white"
                    onClick={() =>
                      setExpandedDirBlacklist((current) => (current === index ? null : index))
                    }
                    aria-expanded={expandedDirBlacklist === index}
                  >
                    <span>屏蔽标签：{task.blacklist?.length || 0} 项</span>
                    <ChevronRight
                      size={15}
                      className={clsx(
                        "transition-transform",
                        expandedDirBlacklist === index && "rotate-90"
                      )}
                    />
                  </button>
                  {expandedDirBlacklist === index && (
                    <div className="mt-3 border-t border-white/10 pt-3">
                      {task.blacklist?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {task.blacklist.map((tag, blacklistIndex) => (
                            <span
                              key={`${tag}-${blacklistIndex}`}
                              className="rounded-lg bg-[#b6ff4d]/10 px-2 py-1 text-xs text-[#d9ff9f]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p>暂无屏蔽标签</p>
                      )}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        ))}
    </PagePanel>
  );
}

function TaskEditForm({
  kind,
  task,
  channels,
  onSubmit
}: {
  kind: "stat" | "dir";
  task: StatTask | DirTask;
  channels: Record<string, string>;
  onSubmit: (field: string, value: string) => Promise<void>;
}) {
  const stat = kind === "stat" ? (task as StatTask) : null;
  const dir = kind === "dir" ? (task as DirTask) : null;
  const [field, setField] = useState(kind === "stat" ? "task_name" : "interval");
  const [targetIndex, setTargetIndex] = useState(0);
  const [value, setValue] = useState(() => {
    if (kind === "stat") return stat?.task_name || "";
    return String(dir?.interval || 15);
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (kind === "stat" && stat) {
      const current = stat[field as keyof StatTask];
      setValue(
        ["add_stats_bl", "rm_stats_bl"].includes(field)
          ? ""
          : Array.isArray(current)
            ? current.join(" ")
            : String(current ?? "")
      );
    }
    if (kind === "dir" && dir) {
      if (field === "target_msg_id") {
        setValue(dir.targets[targetIndex]?.msg_id || "");
        return;
      }
      const current = dir[field as keyof DirTask];
      setValue(Array.isArray(current) ? current.join(" ") : String(current ?? ""));
    }
  }, [field, kind, stat, dir, targetIndex]);

  const fieldOptions = kind === "stat"
    ? [
        ["task_name", "任务名称"], ["table_title", "表头标题"],
        ["channel_id", "频道 ID"], ["msg_id", "消息 ID 或链接"],
        ["trigger_tag", "触发标签"], ["top_n", "上榜名额"],
        ["interval", "更新频率（分钟）"], ["duration", "存活期限（天）"],
        ["add_stats_bl", "追加屏蔽名单"], ["rm_stats_bl", "移除屏蔽名单"],
        ["blacklist_title", "屏蔽区标题"]
      ]
    : [
        ["interval", "扫描频率（分钟）"], ["add_blacklist", "追加屏蔽标签"],
        ["rm_blacklist", "移除屏蔽标签"], ["add_target", "添加发布目标 JSON"],
        ["target_msg_id", "修改发布目标消息 ID"],
        ["rm_target", "移除发布目标索引"]
      ];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    if (["top_n", "interval", "duration", "rm_target"].includes(field) && !/^\d+$/.test(value.trim())) return;
    if (field === "trigger_tag" && !value.trim().startsWith("#")) return;
    if (field === "add_target") {
      try {
        const target = JSON.parse(value);
        if (!target.channel_id || !target.msg_id) return;
      } catch { return; }
    }
    setSubmitting(true);
    const submittedValue = field === "target_msg_id"
      ? JSON.stringify({ index: Number(targetIndex), msg_id: value.trim() })
      : value.trim();
    await onSubmit(field, submittedValue);
    setSubmitting(false);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <Field label="要修改的字段">
        <select className="input" value={field} onChange={(event) => setField(event.target.value)}>
          {fieldOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </Field>
      {stat && (
        <div className="rounded-xl border border-white/10 bg-black/15 p-3">
          <p className="text-xs text-zinc-400">当前屏蔽名单（{stat.stats_blacklist?.length || 0} 项）</p>
          {stat.stats_blacklist?.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {stat.stats_blacklist.map((name, index) => (
                <span
                  key={`${name}-${index}`}
                  className="rounded-lg bg-[#9477ff]/10 px-2 py-1 text-xs text-[#d5c9ff]"
                >
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">暂无屏蔽对象</p>
          )}
        </div>
      )}
      {field === "target_msg_id" && dir ? (
        <div className="space-y-4">
          <Field label="发布目标">
            <select className="input" value={targetIndex} onChange={(event) => {
              const index = Number(event.target.value); setTargetIndex(index); setValue(dir.targets[index]?.msg_id || "");
            }}>
              {dir.targets.map((target, index) => <option key={`${target.channel_id}-${index}`} value={index}>{channelName(target.channel_id, channels)} · 当前 ID {target.msg_id}</option>)}
            </select>
          </Field>
          <Field label="新消息 ID 或链接"><input className="input" value={value} onChange={(event) => setValue(event.target.value)} /></Field>
        </div>
      ) : field === "channel_id" && stat ? (
        <Field label="新值"><ChannelPicker channels={channels} value={value} onChange={setValue} /></Field>
      ) : field === "scan_id" && dir ? (
        <Field label="新值"><ChannelPicker channels={channels} value={value} onChange={setValue} /></Field>
      ) : (
        <Field label="新值" hint={field === "add_target" ? '格式：{"channel_id":"-100...","msg_id":"123"}' : "多个值请用空格或换行分隔。"}>
          <input className="input" type={["top_n", "interval", "duration", "rm_target"].includes(field) ? "number" : "text"} value={value} onChange={(event) => setValue(event.target.value)} />
        </Field>
      )}
      <ActionButton type="submit" icon={submitting ? <LoaderCircle className="animate-spin" size={17} /> : <Settings2 size={17} />}>
        保存修改
      </ActionButton>
    </form>
  );
}

function ChannelsPage({
  channels,
  openCreate,
  edit,
  remove
}: {
  channels: Record<string, string>;
  openCreate: () => void;
  edit: (id: string) => void;
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
              <div className="flex"><button onClick={() => edit(id)} className="rounded-xl p-2 text-zinc-500 transition hover:bg-white/[0.08] hover:text-white" aria-label="编辑频道"><Settings2 size={16} /></button><button
                onClick={() => remove(id)}
                className="rounded-xl p-2 text-zinc-500 transition hover:bg-[#ff7464]/10 hover:text-[#ff7464]"
              >
                <Trash2 size={16} />
              </button></div>
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
      <div className="mb-7 grid gap-5 border-b border-white/10 pb-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div className="min-w-0">
          <p className="font-mono text-[9px] tracking-[0.24em] text-[#c8ff45]">{eyebrow}</p>
          <h2 className="mt-2 text-[clamp(2.5rem,11vw,5.5rem)] font-medium leading-[.9] tracking-[-0.075em]">
            {title}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-500">{description}</p>
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
        "inline-flex min-h-12 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition active:scale-[0.98]",
        variant === "primary"
          ? "bg-[#c8ff45] text-black shadow-[0_10px_35px_rgba(200,255,69,0.1)] hover:bg-[#d8ff7c]"
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
          className="modal-backdrop fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 backdrop-blur-md md:items-center md:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            className="modal-sheet glass max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-t-[18px] p-5 md:rounded-[8px] md:p-8"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="sticky -top-5 z-10 mb-7 flex items-center justify-between border-b border-white/10 bg-[#10130f]/95 pb-5 pt-1 md:-top-8 md:bg-[#10130f]/90 md:pt-2">
              <div>
                <p className="font-mono text-[10px] tracking-[0.18em] text-[#b6ff4d]">
                  COMMAND SHEET
                </p>
                <h2 className="mt-2 text-2xl font-medium tracking-[-0.05em] md:text-3xl">{title}</h2>
              </div>
              <button
                onClick={onClose}
                className="grid h-11 w-11 shrink-0 place-items-center border border-white/10 bg-white/[0.03] text-zinc-400 transition hover:border-[#c8ff45]/40 hover:text-white"
                aria-label="关闭弹窗"
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
  onSubmit,
  initial,
  submitText = "创建同步路径"
}: {
  channels: Record<string, string>;
  onSubmit: (payload: { name: string; src: string; tgt: string[] }) => Promise<void>;
  initial?: Group;
  submitText?: string;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [source, setSource] = useState(initial?.src || "");
  const [targets, setTargets] = useState(initial ? (Array.isArray(initial.tgt) ? initial.tgt : [initial.tgt]) : [""]);
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
        {submitText}
      </ActionButton>
    </form>
  );
}

function ChannelForm({
  onSubmit,
  initial,
  submitText = "收录到频道簿"
}: {
  onSubmit: (payload: { id: string; name: string }) => Promise<void>;
  initial?: { id: string; name: string };
  submitText?: string;
}) {
  const [id, setId] = useState(initial?.id || "");
  const [name, setName] = useState(initial?.name || "");

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
        {submitText}
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

function ButtonMessageForm({
  channels,
  onSubmit,
  editMode = false
}: {
  channels: Record<string, string>;
  onSubmit: (
    form: FormData | { ch_id: string; msg_id?: string; text: string; buttons: { text: string; url: string }[] },
    hasMedia: boolean
  ) => Promise<void>;
  editMode?: boolean;
}) {
  const [channelId, setChannelId] = useState("");
  const [msgId, setMsgId] = useState("");
  const [text, setText] = useState("");
  const [buttons, setButtons] = useState([{ text: "", url: "" }]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  const insertFormat = (tag: string) => {
    setText((prev) => `${prev}<${tag}>文本</${tag}>`);
  };

  return (
    <form
      className="space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!channelId || (editMode && !msgId) || (!editMode && !text && !file)) return;
        const validButtons = buttons.filter((button) => button.text.trim() && button.url.trim());

        if (file) {
          const form = new FormData();
          form.append("ch_id", channelId);
          if (editMode) form.append("msg_id", msgId);
          form.append("text", text);
          form.append("buttons", JSON.stringify(validButtons));
          form.append("media", file);
          await onSubmit(form, true);
          return;
        }

        await onSubmit(
          {
            ch_id: channelId,
            ...(editMode ? { msg_id: msgId } : {}),
            text,
            buttons: validButtons
          },
          false
        );
      }}
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-5">
          <Field label="目标频道">
            <ChannelPicker channels={channels} value={channelId} onChange={setChannelId} />
          </Field>

          {editMode && <Field label="消息 ID 或消息链接">
            <input className="input" value={msgId} onChange={(event) => setMsgId(event.target.value)} placeholder="311 或消息链接" />
          </Field>}

          <Field label="消息正文" hint="后端以 Telegram HTML 模式发送。">
            <div className="mb-2 flex flex-wrap gap-2">
              {[
                ["粗体", "b"],
                ["斜体", "i"],
                ["下划线", "u"],
                ["删除线", "s"],
                ["代码", "code"],
                ["代码块", "pre"],
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
              accept="image/*,video/*,.gif,.pdf,.zip"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </Field>

          <div>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <p className="text-xs font-medium text-zinc-300">按钮列表（可选）</p>
              <p className="text-[11px] text-zinc-500">每行一个按钮</p>
            </div>
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
                    type="url"
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
                      aria-label={`删除按钮 ${index + 1}`}
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
              <Plus size={15} /> 添加按钮
            </button>
          </div>
        </div>

        <ButtonMessagePreview text={text} buttons={buttons} file={file} previewUrl={previewUrl} />
      </div>

      <ActionButton type="submit" icon={<Send size={17} />}>
        {editMode ? "更新频道消息" : "发送到频道"}
      </ActionButton>
    </form>
  );
}

function ButtonMessagePreview({
  text,
  buttons,
  file,
  previewUrl
}: {
  text: string;
  buttons: { text: string; url: string }[];
  file: File | null;
  previewUrl: string;
}) {
  const renderHtml = (value: string) => {
    if (!value) return <span className="text-zinc-600">消息正文预览</span>;
    return <div dangerouslySetInnerHTML={{ __html: value }} />;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b1016] p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.16em] text-zinc-500">LIVE PREVIEW</span>
        <span className="text-[10px] text-[#b6ff4d]">Telegram HTML</span>
      </div>
      <div className="overflow-hidden rounded-xl bg-[#182533] shadow-lg">
        {file && previewUrl && file.type.startsWith("image/") && (
          <img src={previewUrl} alt="媒体预览" className="max-h-56 w-full object-cover" />
        )}
        {file && previewUrl && file.type.startsWith("video/") && (
          <video src={previewUrl} controls className="max-h-56 w-full bg-black object-contain" />
        )}
        {file && previewUrl && (file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif")) && (
          <img src={previewUrl} alt="GIF 预览" className="max-h-56 w-full object-cover" />
        )}
        <div className="whitespace-pre-wrap break-words px-3 py-3 text-sm leading-6 text-white [&_blockquote]:my-2 [&_blockquote]:border-l-4 [&_blockquote]:border-[#70c7ff]/60 [&_blockquote]:bg-black/15 [&_blockquote]:px-3 [&_blockquote]:py-1 [&_code]:rounded [&_code]:bg-black/35 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[#ffd479] [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black/45 [&_pre]:p-3">{renderHtml(text)}</div>
        {buttons.filter((button) => button.text).map((button, index) => (
          <a key={index} href={button.url || "#"} target="_blank" rel="noreferrer" className="mx-3 mb-2 block rounded-lg bg-[#2a9df4]/25 px-3 py-2 text-center text-sm text-[#70c7ff]">
            {button.text}
          </a>
        ))}
      </div>
      {file && <p className="mt-2 truncate text-[10px] text-zinc-500">{file.name}</p>}
    </div>
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

function MemberMonitorForm({
  channels,
  onSubmit
}: {
  channels: Record<string, string>;
  onSubmit: (channelId: string, interval: number) => Promise<void>;
}) {
  const [channelId, setChannelId] = useState("");
  const [interval, setInterval] = useState("60");
  return <form className="space-y-5" onSubmit={async (event) => {
    event.preventDefault();
    if (!channelId || !/^\d+$/.test(interval) || Number(interval) < 1) return;
    await onSubmit(channelId, Number(interval));
  }}>
    <Field label="频道或群组"><ChannelPicker channels={channels} value={channelId} onChange={setChannelId} /></Field>
    <Field label="检测间隔（分钟）" hint="每次检测会覆盖该频道在 WebDAV 上的独立 CSV 备份。">
      <input className="input" type="number" min="1" value={interval} onChange={(event) => setInterval(event.target.value)} />
    </Field>
    <ActionButton type="submit" icon={<UsersRound size={17} />}>创建成员备份任务</ActionButton>
  </form>;
}

function MemberMonitorCard({ item, channels, notify, refresh, updateFromResponse }: {
  item: MemberMonitor;
  channels: Record<string, string>;
  notify: (text: string, type?: "ok" | "error") => void;
  refresh: () => Promise<void>;
  updateFromResponse: (result: { ok: boolean; user?: UserData; msg?: string }) => boolean;
}) {
  const [interval, setInterval] = useState(String(item.interval || 60));
  return <div className="rounded-xl border border-white/10 p-3 text-xs">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div>
      <p className="text-zinc-200">{channelName(item.channel_id, channels)}</p>
      <p className="mt-1 text-zinc-500">{item.member_count || 0} 人{item.last_run ? ` · ${new Date(item.last_run * 1000).toLocaleString()}` : " · 等待首次备份"}</p>
      {item.last_error && <p className="mt-1 text-[#ff7464]">{item.last_error}</p>}
    </div><div className="flex flex-wrap items-center gap-2">
      <input className="input !w-20 !px-2 !py-1.5" type="number" min="1" aria-label="检测间隔（分钟）" value={interval} onChange={(event) => setInterval(event.target.value)} />
      <span className="text-zinc-500">分钟</span>
      <button className="text-[#b6ff4d]" onClick={async () => {
        const result = await requestApi<{ ok: boolean; user?: UserData; msg?: string }>(`/member_monitors/${encodeURIComponent(item.channel_id)}`, "PUT", { interval: Number(interval) });
        if (updateFromResponse(result)) { notify("检测间隔已更新"); refresh(); }
      }}>保存</button>
      <button className="text-[#70c7ff]" onClick={async () => {
        const result = await requestApi<{ ok: boolean; msg?: string }>(`/member_monitors/${encodeURIComponent(item.channel_id)}/download`, "POST");
        notify(result.ok ? "文件将由机器人发送" : result.msg || "下载失败", result.ok ? "ok" : "error");
      }}>下载</button>
      <button className="text-[#ff7464]" onClick={async () => {
        const result = await requestApi<{ ok: boolean; user?: UserData }>(`/member_monitors/${encodeURIComponent(item.channel_id)}`, "DELETE");
        if (updateFromResponse(result)) refresh();
      }}>停止</button>
    </div></div>
  </div>;
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
    <nav aria-label="主导航" className="glass fixed bottom-[calc(10px+var(--safe-bottom))] left-3 right-3 z-40 flex rounded-[10px] p-1.5 lg:hidden">
      {nav.map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={clsx(
            "relative flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[9px] transition",
            active === item.key ? "text-black" : "text-zinc-500 active:text-white"
          )}
        >
          {active === item.key && (
            <motion.span
              layoutId="mobile-nav"
              className="absolute inset-0 bg-[#c8ff45] [clip-path:polygon(0_0,88%_0,100%_22%,100%_100%,12%_100%,0_78%)]"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <item.icon size={18} className="relative" strokeWidth={active === item.key ? 2.2 : 1.7} />
          <span className="relative max-w-full truncate px-0.5">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function channelName(id: string, channels: Record<string, string>) {
  const name = channels[id] || channels[String(id)];
  return name ? `${name} (${id})` : id || "未设置";
}

function TelegramOnlyScreen() {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#9477ff]/10 blur-[100px]"
      />

      <section className="glass relative w-full max-w-md rounded-[28px] p-7 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#b6ff4d] text-black">
          <Radio size={28} strokeWidth={1.8} />
        </div>

        <p className="mt-6 font-mono text-[10px] tracking-[0.2em] text-[#b6ff4d]">
          TELEGRAM WEB APP ONLY
        </p>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          请从 Telegram 内打开
        </h1>

        <p className="mt-4 text-sm leading-7 text-zinc-400">
          当前页面没有检测到 Telegram 身份验证信息。
          请通过机器人菜单中的 Web App 按钮进入控制台。
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-left">
          <div className="flex items-start gap-3">
            <CircleAlert
              size={17}
              className="mt-0.5 shrink-0 text-[#ff7464]"
            />
            <div>
              <p className="text-xs font-medium text-zinc-200">
                当前无法完成身份验证
              </p>
              <p className="mt-2 text-[11px] leading-5 text-zinc-500">
                不要直接复制浏览器地址访问。Telegram 只有在 Mini App
                环境中才会注入 initData。
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[#b6ff4d] px-5 py-3 text-sm font-medium text-black transition hover:bg-[#ceff85]"
        >
          <RefreshCcw size={16} />
          重新检测
        </button>
      </section>
    </main>
  );
}
