"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import LiveClassCard from "@/app/components/LiveClassCard";
import { getTodaysSchedule, getUserDetailsList } from "@/utils/api";

type Props = {
  batchId: string;
  title?: string;
};

export default function TodaysClassSection({
  batchId,
  title = "Today's Class",
}: Props) {
  const router = useRouter();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [teacherMap, setTeacherMap] = useState<
    Record<string, { name: string; imageUrl: string }>
  >({});
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };
  const onMouseUp = () => setIsDragging(false);
  const onMouseLeave = () => setIsDragging(false);
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - (scrollRef.current?.offsetLeft || 0);
    const walk = x - startX;
    if (scrollRef.current) scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  useEffect(() => {
    if (!batchId) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const scheduleRes = await getTodaysSchedule(batchId);
        const scheduleData = scheduleRes.data || [];

        const videoSchedule = scheduleData.filter(
          (item: any) => item.isVideoLecture === true
        );

        const teacherIdSet = new Set<string>();
        videoSchedule.forEach((item: any) => {
          if (Array.isArray(item.teachers)) {
            item.teachers.forEach((id: string) => teacherIdSet.add(id));
          }
        });
        const uniqueTeacherIds = Array.from(teacherIdSet);

        let teacherList: any[] = [];
        if (uniqueTeacherIds.length > 0) {
          try {
            const teacherRes = await getUserDetailsList(uniqueTeacherIds);
            teacherList = teacherRes.data || [];
          } catch {
            teacherList = [];
          }
        }

        const map: Record<string, { name: string; imageUrl: string }> = {};
        teacherList.forEach((teacher: any) => {
          map[teacher._id] = {
            name: teacher.name,
            imageUrl: teacher.imageId
              ? `${teacher.imageId.baseUrl}${teacher.imageId.key}`
              : "/assets/img/teacher-placeholder.png",
          };
        });
        videoSchedule.forEach((item: any) => {
          const hasTeachers =
            Array.isArray(item.teachers) && item.teachers.length > 0;
          if (!hasTeachers && item.videoDetails?.image) {
            map[item._id] = { name: "", imageUrl: item.videoDetails.image };
          }
        });

        if (cancelled) return;
        setSchedule(videoSchedule);
        setTeacherMap(map);
        setErrorMsg("");
      } catch (err: any) {
        if (cancelled) return;
        let message = "Failed to fetch today's schedule.";
        if (
          err?.message?.includes("401") ||
          err?.message?.toLowerCase?.().includes("unauthorized")
        ) {
          message = "You are not authorized. Please log in again.";
        } else if (err?.message) {
          message = err.message;
        }
        setErrorMsg(message);
        setSchedule([]);
        setTeacherMap({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [batchId]);

  return (
    <div className="divshadow bg-background border rounded-lg p-4 sm:p-6">
      <h3 className="text-md font-medium mb-2">{title}</h3>
      <div className="rounded-lg p-1 sm:p-3">
        {errorMsg && (
          <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-center">
            {errorMsg}
          </div>
        )}
        <div
          ref={scrollRef}
          className={`flex gap-4 overflow-x-auto whitespace-nowrap ${
            schedule.length > 0 ? "cursor-grab select-none" : ""
          }`}
          style={{ scrollBehavior: "smooth" }}
          onMouseDown={schedule.length > 0 ? onMouseDown : undefined}
          onMouseUp={schedule.length > 0 ? onMouseUp : undefined}
          onMouseLeave={schedule.length > 0 ? onMouseLeave : undefined}
          onMouseMove={schedule.length > 0 ? onMouseMove : undefined}
        >
          {loading ? (
            <div className="bg-[#7e7e7e29] rounded-lg p-6 sm:p-8 text-center text-foreground w-full animate-pulse">
              Loading today's classes...
            </div>
          ) : schedule.length === 0 ? (
            <div className="bg-[#7e7e7e29] rounded-lg p-6 sm:p-8 text-center text-foreground w-full">
              Classes not Scheduled yet
            </div>
          ) : (
            schedule.map((cls: any, idx: number) => {
              const teacherId = cls.teachers?.[0];
              const teacher = teacherMap[teacherId] || teacherMap[cls._id];
              const teacherName = teacher?.name || "";
              const teacherImage = teacher?.imageUrl;

              const startTime = new Date(cls.startTime);
              const endTime = new Date(cls.endTime);
              const now = new Date();

              const isBefore = now < startTime;
              const isDuring = now >= startTime && now <= endTime;
              const isAfter = now > endTime;

              const hoursLeft = Math.floor(
                (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)
              );
              const minutesLeft = Math.floor(
                ((startTime.getTime() - now.getTime()) / (1000 * 60)) % 60
              );

              const handleClick = () => {
                const parentId = cls.batchId || batchId;
                const subject = cls.subjectId?._id || cls.subjectId || "";
                const childId = cls._id;
                const urlType = cls.urlType;

                // Not started yet -> inform the user
                if (isBefore) {
                  toast.error(
                    startTime > now
                      ? `Upcoming live class in ${
                          hoursLeft > 0 ? `${hoursLeft}h ` : ""
                        }${minutesLeft}m`
                      : "This class has not started yet. Try refreshing..."
                  );
                  return;
                }

                // Live window -> /live page, same stream-url format (penpencilvdo)
                if (isDuring) {
                  router.push(
                    `/live?batchId=${parentId}&SubjectId=${subject}&ChildId=${childId}&Type=penpencilvdo&isLocked=false`
                  );
                  return;
                }



                // Ended or already recorded -> open like a normal recorded class
                if (isAfter || urlType === "penpencilvdo" || urlType === "vimeo") {
                  router.push(
                    `/watch?batchId=${parentId}&SubjectId=${subject}&ChildId=${childId}&Type=${
                      urlType || "penpencilvdo"
                    }&isLocked=false`
                  );
                  return;
                }

                router.push(
                  `/watch?batchId=${parentId}&SubjectId=${subject}&ChildId=${childId}&Type=${
                    urlType || "penpencilvdo"
                  }&isLocked=false`
                );
              };

              return (
                <LiveClassCard
                  key={cls._id}
                  teacherName={teacherName}
                  teacherImage={teacherImage}
                  subject={cls.subjectId?.name || "Subject"}
                  startTime={startTime.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  tag={cls.tag}
                  onClick={handleClick}
                  priority={idx === 0}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
