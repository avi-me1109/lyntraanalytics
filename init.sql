CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE SEQUENCE IF NOT EXISTS weekly_metrics_id_seq;

CREATE ROLE web_user nologin;
GRANT usage ON schema public TO web_user;

create table public.app_config (
  id uuid not null default uuid_generate_v4 (),
  key text not null,
  value text not null,
  constraint app_config_pkey primary key (id),
  constraint app_config_key_key unique (key)
) TABLESPACE pg_default;

create table public.courses (
  id serial not null,
  course_code character varying(10) null,
  course_name character varying(100) null,
  professor character varying(100) null,
  total_students_enrolled integer null,
  status boolean null,
  constraint courses_pkey primary key (id),
  constraint courses_course_code_key unique (course_code)
) TABLESPACE pg_default;

create table public.retention (
  id integer not null default nextval('weekly_metrics_id_seq'::regclass),
  week_start date not null,
  prior_weekly_active_users integer null default 0,
  current_weekly_active_users integer null default 0,
  constraint retention_pkey primary key (id),
  constraint retention_composite_key unique (week_start)
) TABLESPACE pg_default;

create table public.satisfaction_nps (
  id integer not null default nextval('weekly_metrics_id_seq'::regclass),
  week_start date not null,
  student_survey_responses integer null default 0,
  student_promoters integer null default 0,
  student_detractors integer null default 0,
  professor_responses real null,
  professor_promoters real null,
  professor_detractors real null,
  course_id integer null,
  constraint satisfaction_nps_pkey primary key (id),
  constraint satisfaction_nps_composite_key unique (course_id, week_start),
  constraint satisfaction_nps_course_id_fkey foreign KEY (course_id) references courses (id)
) TABLESPACE pg_default;

create table public.student_engagement (
  id serial not null,
  week_start date not null,
  total_enrolled integer null default 0,
  students_activated integer null default 0,
  weekly_active_users integer null default 0,
  avg_sessions_per_student numeric(5, 2) null default 0.0,
  course_id integer null,
  constraint weekly_metrics_pkey primary key (id),
  constraint student_engagement_composite_key unique (course_id, week_start),
  constraint student_engagement_course_id_fkey foreign KEY (course_id) references courses (id)
) TABLESPACE pg_default;

create table public.task_metrics (
  id integer not null default nextval('weekly_metrics_id_seq'::regclass),
  week_start date not null,
  canvas_assignments integer null default 0,
  tasks_broken_ai integer null default 0,
  study_session_completion integer null default 0,
  assignment_breakdown_usage real null,
  focus_mode_feature_usage real null,
  adaptive_scheduling_usage real null,
  course_id integer null,
  constraint task_metrics_pkey primary key (id),
  constraint task_metrics_composite_key unique (course_id, week_start),
  constraint task_metrics_course_id_fkey foreign KEY (course_id) references courses (id)
) TABLESPACE pg_default;

create table public.technical_health (
  id integer not null default nextval('weekly_metrics_id_seq'::regclass),
  week_start date not null,
  p1_bugs integer null default 0,
  p2_bugs integer null default 0,
  canvas_sync_errors integer null default 0,
  total_sync_attempts numeric(10, 2) null default 0.0,
  avg_load_time real null,
  constraint technical_health_pkey primary key (id),
  constraint technical_health_composite_key unique (week_start)
) TABLESPACE pg_default;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO web_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO web_user;

create view public.dashboard_view_class_specific as
select
  m.week_start,
  c.course_code,
  c.course_name,
  c.professor,
  c.total_students_enrolled as class_capacity,
  m.total_enrolled as app_enrolled,
  c.status,
  m.students_activated,
  m.weekly_active_users,
  COALESCE(a.canvas_assignments, 0) as canvas_assignments,
  COALESCE(a.tasks_broken_ai, 0) as tasks_broken_ai,
  case
    when m.total_enrolled > 0 then m.students_activated::double precision / m.total_enrolled::double precision
    else 0::double precision
  end as activation_rate,
  case
    when m.total_enrolled > 0 then m.weekly_active_users::double precision / m.total_enrolled::double precision
    else 0::double precision
  end as wau_rate,
  case
    when a.canvas_assignments > 0 then a.canvas_assignments::double precision / a.tasks_broken_ai::double precision
    else 0::double precision
  end as task_completion_rate,
  b.student_survey_responses,
  b.student_promoters,
  b.student_detractors,
  case
    when b.student_survey_responses > 0 then (
      b.student_promoters::double precision - b.student_detractors::double precision
    ) / b.student_survey_responses::double precision
    else 0::double precision
  end as student_nps,
  b.professor_responses,
  b.professor_promoters,
  b.professor_detractors,
  case
    when b.professor_responses > 0::double precision then (
      b.professor_promoters::double precision - b.professor_detractors::double precision
    ) / b.professor_responses
    else 0::double precision
  end as professor_nps
from
  student_engagement m
  join courses c on m.course_id = c.id
  left join task_metrics a on m.course_id = a.course_id
  and m.week_start = a.week_start
  left join satisfaction_nps b on m.course_id = b.course_id
  and m.week_start = b.week_start
order by
  m.week_start desc;

create view public.dashboard_view_global as
with
  class_specifics as (
    select
      m.week_start,
      sum(m.total_enrolled) as global_app_enrolled,
      sum(m.students_activated) as global_students_activated,
      sum(m.weekly_active_users) as global_weekly_active_users,
      avg(m.avg_sessions_per_student) as global_avg_sessions_per_student,
      case
        when sum(m.total_enrolled) > 0 then sum(m.students_activated)::double precision / sum(m.total_enrolled)::double precision
        else 0::double precision
      end as global_activation_rate,
      case
        when sum(m.total_enrolled) > 0 then sum(m.weekly_active_users)::double precision / sum(m.total_enrolled)::double precision
        else 0::double precision
      end as global_wau_rate,
      sum(COALESCE(a.canvas_assignments, 0)) as global_canvas_assignments,
      sum(COALESCE(a.tasks_broken_ai, 0)) as global_tasks_broken_ai,
      sum(COALESCE(a.study_session_completion, 0)) as global_study_session_completion,
      sum(COALESCE(a.assignment_breakdown_usage, 0::real)) as global_assignment_breakdown_usage,
      sum(COALESCE(a.focus_mode_feature_usage, 0::real)) as global_focus_mode_feature_usage,
      sum(COALESCE(a.adaptive_scheduling_usage, 0::real)) as global_adaptive_scheduling_usage,
      case
        when sum(a.canvas_assignments) > 0 then sum(a.canvas_assignments)::double precision / sum(a.tasks_broken_ai)::double precision
        else 0::double precision
      end as global_task_completion_rate,
      sum(b.student_survey_responses) as global_student_survey_responses,
      sum(b.student_promoters) as global_student_promoters,
      sum(b.student_detractors) as global_student_detractors,
      sum(b.professor_responses) as global_professor_responses,
      sum(b.professor_promoters) as global_professor_promoters,
      sum(b.professor_detractors) as global_professor_detractors,
      case
        when sum(b.student_survey_responses) > 0 then (
          sum(b.student_promoters)::double precision - sum(b.student_detractors)::double precision
        ) / sum(b.student_survey_responses)::double precision
        else 0::double precision
      end as global_student_nps,
      case
        when sum(b.professor_responses) > 0::double precision then (
          sum(b.professor_promoters)::double precision - sum(b.professor_detractors)::double precision
        ) / sum(b.professor_responses)
        else 0::double precision
      end as global_professor_nps
    from
      student_engagement m
      left join task_metrics a on m.course_id = a.course_id
      and m.week_start = a.week_start
      left join satisfaction_nps b on m.course_id = b.course_id
      and m.week_start = b.week_start
    group by
      m.week_start
  ),
  retention_agg as (
    select
      retention.week_start,
      sum(retention.prior_weekly_active_users) as global_prior_weekly_active_users,
      sum(retention.current_weekly_active_users) as global_current_weekly_active_users
    from
      retention
    group by
      retention.week_start
  ),
  health_agg as (
    select
      technical_health.week_start,
      sum(technical_health.p1_bugs) as global_p1_bugs,
      sum(technical_health.p2_bugs) as global_p2_bugs,
      sum(technical_health.canvas_sync_errors) as global_canvas_sync_errors,
      sum(technical_health.total_sync_attempts) as global_total_sync_attempts,
      avg(technical_health.avg_load_time) as global_avg_load_time
    from
      technical_health
    group by
      technical_health.week_start
  )
select
  w.week_start,
  w.global_app_enrolled,
  w.global_students_activated,
  w.global_weekly_active_users,
  w.global_avg_sessions_per_student,
  w.global_activation_rate,
  w.global_wau_rate,
  w.global_canvas_assignments,
  w.global_tasks_broken_ai,
  w.global_study_session_completion,
  w.global_assignment_breakdown_usage,
  w.global_focus_mode_feature_usage,
  w.global_adaptive_scheduling_usage,
  w.global_task_completion_rate,
  w.global_student_survey_responses,
  w.global_student_promoters,
  w.global_student_detractors,
  w.global_professor_responses,
  w.global_professor_promoters,
  w.global_professor_detractors,
  w.global_student_nps,
  w.global_professor_nps,
  r.global_prior_weekly_active_users,
  r.global_current_weekly_active_users,
  case
    when r.global_prior_weekly_active_users > 0 then r.global_current_weekly_active_users::double precision / r.global_prior_weekly_active_users::double precision
    else 0::double precision
  end as global_week_over_week_retention,
  h.global_p1_bugs,
  h.global_p2_bugs,
  h.global_canvas_sync_errors,
  h.global_total_sync_attempts,
  h.global_avg_load_time,
  case
    when h.global_total_sync_attempts > 0::numeric then h.global_canvas_sync_errors::double precision / h.global_total_sync_attempts::double precision
    else 0::double precision
  end as global_sync_error_rate
from
  class_specifics w
  left join retention_agg r on w.week_start = r.week_start
  left join health_agg h on w.week_start = h.week_start
order by
  w.week_start desc;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT SELECT ON TABLES TO web_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public 
GRANT USAGE, SELECT ON SEQUENCES TO web_user;