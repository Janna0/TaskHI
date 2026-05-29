-- Run this in your Supabase SQL Editor
-- Creates the predefined_tasks table, enables RLS, and seeds all tasks

CREATE TABLE IF NOT EXISTS predefined_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  time_required text,
  competency text,
  phase text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE predefined_tasks ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read predefined tasks
CREATE POLICY "predefined_tasks_select" ON predefined_tasks
  FOR SELECT USING (true);

-- Authenticated users can insert, update, delete
CREATE POLICY "predefined_tasks_insert" ON predefined_tasks
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "predefined_tasks_update" ON predefined_tasks
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "predefined_tasks_delete" ON predefined_tasks
  FOR DELETE TO authenticated USING (true);

-- Seed data (safe to re-run: only inserts if table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM predefined_tasks LIMIT 1) THEN
    INSERT INTO predefined_tasks (title, description, time_required, competency, phase, position) VALUES
    -- PHASE 1 - Pre Onboarding & Intelligence Gathering
    ('Send questionnaire', NULL, 'A few minutes', 'L3', 'PHASE 1 - Pre Onboarding & Intelligence Gathering', 0),
    ('Draft Scope (Roadmap)', NULL, 'Half a day (4-8 hours)', 'L3', 'PHASE 1 - Pre Onboarding & Intelligence Gathering', 1),
    ('Send scope for approval (Roadmap)', NULL, 'A few minutes', 'L3', 'PHASE 1 - Pre Onboarding & Intelligence Gathering', 2),
    ('Adjust/approve scope based on feedback (Roadmap)', NULL, '1 day', 'L4', 'PHASE 1 - Pre Onboarding & Intelligence Gathering', 3),
    ('Request Data', 'Provide KPIs file for data request.', 'About 30 minutes', 'L3', 'PHASE 1 - Pre Onboarding & Intelligence Gathering', 4),
    ('Analyse Data', 'Perform analysis and benchmarking with industry standards and VIP dynamic segmentation.', '1 week', 'L3', 'PHASE 1 - Pre Onboarding & Intelligence Gathering', 5),
    ('Setup Data Presentation', 'Create a presentation with analysis results.', '1 day', 'L4', 'PHASE 1 - Pre Onboarding & Intelligence Gathering', 6),
    ('Present Data Presentation', 'Present the analysis on a call with the client.', 'About 1 hour', 'L3', 'PHASE 1 - Pre Onboarding & Intelligence Gathering', 7),
    -- PHASE 2 - Initiation & Foundations
    ('Kick-Off Call', 'Schedule and run a Kick-off call with a client to address pending questions and get acquainted with the team.', 'About 1 hour', 'L4', 'PHASE 2 - Initiation & Foundations', 8),
    ('Review of existing setup', 'Review existing bonus, lifecycle/campaigns and gamification setup. Create a document with questions and recommendations.', 'A few days', 'L3', 'PHASE 2 - Initiation & Foundations', 9),
    ('Setup Slack Channel', 'Create a dedicated project channel as projectname-daily and projectname-internal in Slack.', 'About 30 minutes', 'L1', 'PHASE 2 - Initiation & Foundations', 10),
    ('Invite Team members', 'Invite relevant team members in each channel.', 'About 30 minutes', 'L1', 'PHASE 2 - Initiation & Foundations', 11),
    ('Schedule weekly calls', 'Schedule weekly update calls with the client. Invite all relevant team members to the call, add a Google Meet link and configure auto recording and transcription.', 'About 30 minutes', 'L1', 'PHASE 2 - Initiation & Foundations', 12),
    ('Having weekly calls', 'Participate in weekly calls to align on pending items or discuss dependencies.', '1 day', 'L4', 'PHASE 2 - Initiation & Foundations', 13),
    ('Setup Asana Board', 'Setup a dedicated Asana board and include all pending items to track the progress onwards.', 'About 1 hour', 'L1', 'PHASE 2 - Initiation & Foundations', 14),
    ('Update Project Details', 'Update the project details in the tracking file.', 'About 1 hour', 'L1', 'PHASE 2 - Initiation & Foundations', 15),
    ('Create Folder Structure', 'Create dedicated folder in Drive with project name and create the following subfolders: Documents, Lifecycles, Gamification, Project SHARED.', 'About 30 minutes', 'L1', 'PHASE 2 - Initiation & Foundations', 16),
    ('Request Access BO', 'Request the relevant contact person from client''s team to provide the dedicated PMs of the project with access to BO.', 'A few minutes', 'L1', 'PHASE 2 - Initiation & Foundations', 17),
    ('Request Access CRM', 'Request the success manager from the CRM or the client to create accounts/give access to the relevant instance.', 'A few minutes', 'L1', 'PHASE 2 - Initiation & Foundations', 18),
    ('Request Access CMS (if applicable)', 'Editing of bonus summary or promotion pages - access to the tool needs to be requested if client agrees.', 'A few minutes', 'L1', 'PHASE 2 - Initiation & Foundations', 19),
    ('Request Brand Guidelines', 'Request Brand Guidelines from the client.', 'A few minutes', 'L1', 'PHASE 2 - Initiation & Foundations', 20),
    ('Request Market Information', 'Request market information, completed competitor analysis or any relevant documentation which can help with further development of player lifecycles or gamification.', 'A few minutes', 'L1', 'PHASE 2 - Initiation & Foundations', 21),
    ('Research Competitors (Competitor Analysis)', 'Research competitors and complete analysis. Don''t rely on AI.', '1 week', 'L1', 'PHASE 2 - Initiation & Foundations', 22),
    ('Setup Presentation (Competitor Analysis)', 'Setup presentation editing the predefined structure in Figma.', '1 day', 'L2', 'PHASE 2 - Initiation & Foundations', 23),
    ('Present Competitor Analysis', 'Present competitor analysis to the team internally, then to the client.', 'About 1 hour', 'L3', 'PHASE 2 - Initiation & Foundations', 24),
    ('Request of Master templates for Email / Popup', 'Edit master template reference from our internal resource and adjust it with approximate relevant colors/fonts of client''s brand.', 'Half a day (4-8 hours)', 'L2', 'PHASE 2 - Initiation & Foundations', 25),
    ('Request Data', 'Request raw data with KPIs template from the client.', 'A few minutes', 'L2', 'PHASE 2 - Initiation & Foundations', 26),
    ('Analyse Data', 'Analyse data after collecting; perform dynamic segmentation and define aggregative values and By Player/Monthly SUMs from the KPIs.', '1 week', 'L3', 'PHASE 2 - Initiation & Foundations', 27),
    ('Setup Data Presentation', 'Setup KPIs data report and present internally.', '1 day', 'L3', 'PHASE 2 - Initiation & Foundations', 28),
    ('Present Data Presentation', 'Present the Data analysis presentation to client.', 'About 1 hour', 'L3', 'PHASE 2 - Initiation & Foundations', 29),
    -- PHASE 3 - Strategic Design & Mapping - Lifecycles
    ('Define Lifecycle Definitions', 'Define the key points of the lifecycles - conditions, touch points, segments, offers and communication. Apply the structure strategy according to integration/BO/CRM capabilities.', 'Half a day (4-8 hours)', 'L3', 'PHASE 3 - Strategic Design & Mapping - Lifecycles', 30),
    ('Map out Lifecycles Flows', 'Create the lifecycles touch points communication and offers flow and the lifecycles in the flowchart after approval.', '1 week', 'L3', 'PHASE 3 - Strategic Design & Mapping - Lifecycles', 31),
    ('Setup Lifecycle Presentation', 'Create a presentation with lifecycle flows.', '1 day', 'L3', 'PHASE 3 - Strategic Design & Mapping - Lifecycles', 32),
    ('Define Communication Channels', 'Define communication channels based on market restrictions, client preference and tech capacity. After defining channels, plan content for all communication channels.', 'About 1 hour', 'L3', 'PHASE 3 - Strategic Design & Mapping - Lifecycles', 33),
    ('Draft Communication Plan', 'Communication plan consists of phases, instances, offers, asset names and short communication messages describing the offers and each instance.', '1 week', 'L2', 'PHASE 3 - Strategic Design & Mapping - Lifecycles', 34),
    ('Draft Asset Overview', 'Assets overview is a group of asset conventions divided to separate tabs including each type of communication channel. It includes the asset convention, banner copy for each instance and communication message.', 'Half a day (4-8 hours)', 'L2', 'PHASE 3 - Strategic Design & Mapping - Lifecycles', 35),
    ('Brief Content', 'Content briefing is done by us - content creation depends on client''s team capacity. If they have a copywriter we create the content with AI and hand over to client.', '1 week', 'L2', 'PHASE 3 - Strategic Design & Mapping - Lifecycles', 36),
    ('Bonus Mapping', 'Bonus map includes the bonus internal names according to naming conventions of each lifecycle, promotion or gamification asset, bonus ID or promo-code of the platform, bonus category and bonus type.', '1 day', 'L3', 'PHASE 3 - Strategic Design & Mapping - Lifecycles', 37),
    ('Ensure correct Naming Convention', 'Naming conventions have the same structure but can include different content. For example a convention for a mission or a lifecycle journey.', 'About 1 hour', 'L2', 'PHASE 3 - Strategic Design & Mapping - Lifecycles', 38),
    ('Present Lifecycle Presentation', 'Lifecycle presentation includes the previously approved Offers from Draft Communication Plan and lifecycle demonstrative flows. Showcase which phase or instance should use which bonuses or communication channel.', 'About 1 hour', 'L3', 'PHASE 3 - Strategic Design & Mapping - Lifecycles', 39),
    ('Email Template walkthrough', 'We manage different types of email templates - html+css, drag and drop/visual or liquid types. Show the technical structure and logic to client and help with refining if capacity allows.', 'About 1 hour', 'L2', 'PHASE 3 - Strategic Design & Mapping - Lifecycles', 40),
    ('Pop-Up walkthrough', 'We manage html+css+json files or pure html+css. Walk through the structure and logic with the client.', 'About 1 hour', 'L2', 'PHASE 3 - Strategic Design & Mapping - Lifecycles', 41),
    ('Inbox walkthrough', 'Inbox messages have 2 types of structures - rich and simple. Rich inbox messages include any html+css which is opened when clicking the simple inbox message.', 'About 1 hour', 'L2', 'PHASE 3 - Strategic Design & Mapping - Lifecycles', 42),
    ('Arrange call with Designer', 'Arrange a call with the designer to explain the communication plans and what kind of creatives are required.', 'About 1 hour', 'L1', 'PHASE 3 - Strategic Design & Mapping - Lifecycles', 43),
    -- PHASE 4 - Strategic Design & Mapping - Gamification
    ('Walk through Smartico Playground', 'Presenting Smartico ICE widget, possibilities and the BO if necessary. Helps client understand gamification as an additional component of CRM.', 'About 1 hour', 'L3', 'PHASE 4 - Strategic Design & Mapping - Gamification', 44),
    ('Gamification Intro with examples (Word doc)', NULL, 'About 1 hour', 'L2', 'PHASE 4 - Strategic Design & Mapping - Gamification', 45),
    ('Define Feature usage', NULL, 'Half a day (4-8 hours)', 'L3', 'PHASE 4 - Strategic Design & Mapping - Gamification', 46),
    ('Define Generosity Level & Economics', 'Using the Data Analysis done previously, take the necessary figures for defining the generosity level in a loyalty program.', '1 day', 'L4', 'PHASE 4 - Strategic Design & Mapping - Gamification', 47),
    ('Finalize Generosity Level & Economics', 'Approve the figures with the client and proceed with future planning of loyalty program.', 'A few days', 'L4', 'PHASE 4 - Strategic Design & Mapping - Gamification', 48),
    ('Define Reward logic', 'Define the reward upon level up using the defined figures.', '1 day', 'L4', 'PHASE 4 - Strategic Design & Mapping - Gamification', 49),
    ('Define required bonuses for store and mini games', 'Define the store items, types, considering the bonus integration possibilities and the logic of giving back to the player.', '1 day', 'L4', 'PHASE 4 - Strategic Design & Mapping - Gamification', 50),
    ('Define level progression', 'Define the level progression amount according to the KPIs.', '1 day', 'L4', 'PHASE 4 - Strategic Design & Mapping - Gamification', 51),
    ('Map out Gamification sheet', 'Map out the Gamification sheet with the features setup plan, including bonuses used in the store, mission tasks and reward, etc.', '1 week', 'L3', 'PHASE 4 - Strategic Design & Mapping - Gamification', 52),
    ('Present Gamification sheet', 'Present the mapped out content to client.', 'About 1 hour', 'L3', 'PHASE 4 - Strategic Design & Mapping - Gamification', 53),
    ('Finalize/approval Adjustments', 'Finalize the plan if there are any adjustments needed.', '1 day', 'L3', 'PHASE 4 - Strategic Design & Mapping - Gamification', 54),
    ('Arrange call with Designer', 'Arrange a call with the designer to explain how to use gamification plan and what kind of creatives are required.', 'About 1 hour', 'L1', 'PHASE 4 - Strategic Design & Mapping - Gamification', 55),
    -- PHASE 5 - Implementation & Build - Lifecycle
    ('Request Assets', 'Request the assets in the Assets Overview from the designer.', 'About 1 hour', 'L2', 'PHASE 5 - Implementation & Build - Lifecycle', 56),
    ('Request Content', 'Request the marketing copies from copywriter.', 'About 1 hour', 'L2', 'PHASE 5 - Implementation & Build - Lifecycle', 57),
    ('Writing content', 'If the client team doesn''t have a content specialist, brief the content and request to create the copies from the native speaker of the market from client''s side.', '1 week', 'L2', 'PHASE 5 - Implementation & Build - Lifecycle', 58),
    ('Define segments', 'Microsegmentation of lifecycles heavily depends on the tech events the platform sends. Overall segments of onboarding journeys are triggered with registration and inactivity after registration.', '1 day', 'L3', 'PHASE 5 - Implementation & Build - Lifecycle', 59),
    ('Setup lifecycle structure', NULL, '1 week', 'L4', 'PHASE 5 - Implementation & Build - Lifecycle', 60),
    ('Test for events', NULL, '1 week', 'L2', 'PHASE 5 - Implementation & Build - Lifecycle', 61),
    ('Setup Bonus (if applicable in BO)', NULL, '1 week', 'L2', 'PHASE 5 - Implementation & Build - Lifecycle', 62),
    ('Setup Email Templates', NULL, '1 week', 'L2', 'PHASE 5 - Implementation & Build - Lifecycle', 63),
    ('Create lifecycle flow', NULL, '1 week', 'L3', 'PHASE 5 - Implementation & Build - Lifecycle', 64),
    ('Setup Dynamic Bonuses (if applicable)', NULL, '1 week', 'L2', 'PHASE 5 - Implementation & Build - Lifecycle', 65),
    ('Test Dynamic Bonuses', NULL, '1 week', 'L2', 'PHASE 5 - Implementation & Build - Lifecycle', 66),
    ('Test Bonus', NULL, '1 week', 'L2', 'PHASE 5 - Implementation & Build - Lifecycle', 67),
    ('Test Lifecycles (Staging if applicable)', NULL, '1 week', 'L2', 'PHASE 5 - Implementation & Build - Lifecycle', 68),
    ('Test Lifecycles (Production)', NULL, '1 week', 'L3', 'PHASE 5 - Implementation & Build - Lifecycle', 69),
    -- PHASE 6 - Quality Assurance & Launch - Lifecycles
    ('QA item 1', NULL, '1 week', 'L4', 'PHASE 6 - Quality Assurance & Launch - Lifecycles', 70),
    ('QA item 2', NULL, '1 week', 'L4', 'PHASE 6 - Quality Assurance & Launch - Lifecycles', 71),
    ('QA item 3', NULL, '1 week', 'L4', 'PHASE 6 - Quality Assurance & Launch - Lifecycles', 72),
    ('Launch Lifecycles', NULL, '1 day', 'L4', 'PHASE 6 - Quality Assurance & Launch - Lifecycles', 73),
    -- PHASE 7 - Implementation & Build - Gamification
    ('Request Skins (follow up)', NULL, 'About 1 hour', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 74),
    ('Implement Skins (follow up)', NULL, 'About 1 hour', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 75),
    ('Map out related content', NULL, '1 week', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 76),
    ('Setup Missions', NULL, '1 week', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 77),
    ('Test Missions', NULL, '1 day', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 78),
    ('Setup Mini Games', NULL, '1 day', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 79),
    ('Test Mini Games', NULL, 'Half a day (4-8 hours)', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 80),
    ('Setup Store Items', NULL, '1 day', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 81),
    ('Test Store Items', NULL, 'Half a day (4-8 hours)', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 82),
    ('Setup Badges', NULL, 'Half a day (4-8 hours)', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 83),
    ('Test Badges', NULL, 'Half a day (4-8 hours)', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 84),
    ('Setup Levels', NULL, 'About 1 hour', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 85),
    ('Test Level Progression', NULL, 'About 1 hour', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 86),
    ('Map out Raffles', NULL, '1 day', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 87),
    ('Setup Raffle', NULL, 'Half a day (4-8 hours)', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 88),
    ('Test Raffle', NULL, 'Half a day (4-8 hours)', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 89),
    ('Map out lootboxes', NULL, 'Half a day (4-8 hours)', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 90),
    ('Setup Lootboxes', NULL, 'Half a day (4-8 hours)', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 91),
    ('Test Lootboxes', NULL, 'Half a day (4-8 hours)', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 92),
    ('Map out tournaments', NULL, 'Half a day (4-8 hours)', 'L3', 'PHASE 7 - Implementation & Build - Gamification', 93),
    ('Setup Tournaments', NULL, '1 day', 'L3', 'PHASE 7 - Implementation & Build - Gamification', 94),
    ('Test Tournaments', NULL, 'Half a day (4-8 hours)', 'L3', 'PHASE 7 - Implementation & Build - Gamification', 95),
    ('Setup Automation Rule', NULL, 'About 30 minutes', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 96),
    ('Test Automation Rule', NULL, 'About 30 minutes', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 97),
    ('Map out leaderboard', NULL, 'About 30 minutes', 'L3', 'PHASE 7 - Implementation & Build - Gamification', 98),
    ('Setup Leaderboards', NULL, 'About 30 minutes', 'L1', 'PHASE 7 - Implementation & Build - Gamification', 99),
    ('Test Leaderboards', NULL, 'About 30 minutes', 'L1', 'PHASE 7 - Implementation & Build - Gamification', 100),
    ('Setup Level-up bonuses', NULL, '1 week', 'L3', 'PHASE 7 - Implementation & Build - Gamification', 101),
    ('Test Level-up bonuses', NULL, '1 day', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 102),
    ('Map out cashback', NULL, 'About 1 hour', 'L3', 'PHASE 7 - Implementation & Build - Gamification', 103),
    ('Setup Cashback', NULL, '1 day', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 104),
    ('Test cashback', NULL, '1 day', 'L2', 'PHASE 7 - Implementation & Build - Gamification', 105),
    -- PHASE 8 - Quality Assurance & Launch
    ('QA item 1', NULL, '1 week', 'L4', 'PHASE 8 - Quality Assurance & Launch', 106),
    ('QA item 2', NULL, '1 week', 'L4', 'PHASE 8 - Quality Assurance & Launch', 107),
    ('QA item 3', NULL, '1 week', 'L4', 'PHASE 8 - Quality Assurance & Launch', 108),
    ('Launch Lifecycles', NULL, '1 day', 'L4', 'PHASE 8 - Quality Assurance & Launch', 109),
    -- PHASE 9 - Execution
    ('Weekly catch-up (Operations) (on Mon/Tue)', NULL, 'About 1 hour', 'L2', 'PHASE 9 - Execution', 110),
    ('Weekly catch-up (High-level) (on Thu/Fri)', NULL, 'About 1 hour', 'L2', 'PHASE 9 - Execution', 111),
    ('Monthly Promo Plan', NULL, '1 week', 'L4', 'PHASE 9 - Execution', 112),
    ('Asset Request (Ad-hoc)', NULL, 'About 1 hour', 'L1', 'PHASE 9 - Execution', 113),
    ('Content Request (Ad-hoc)', NULL, 'About 1 hour', 'L1', 'PHASE 9 - Execution', 114),
    ('Bonus Configuration (BO)', NULL, '1 day', 'L2', 'PHASE 9 - Execution', 115),
    ('Bonus Setup (CRM)', NULL, 'About 1 hour', 'L2', 'PHASE 9 - Execution', 116),
    ('Email Setup', NULL, 'About 1 hour', 'L1', 'PHASE 9 - Execution', 117),
    ('Pop-Up Setup', NULL, 'About 1 hour', 'L1', 'PHASE 9 - Execution', 118),
    ('SMS Setup', NULL, 'About 1 hour', 'L1', 'PHASE 9 - Execution', 119),
    ('Segment Setup', NULL, 'About 1 hour', 'L2', 'PHASE 9 - Execution', 120),
    ('Bonus Testing', NULL, 'About 1 hour', 'L3', 'PHASE 9 - Execution', 121),
    ('Email Testing', NULL, 'A few minutes', 'L3', 'PHASE 9 - Execution', 122),
    ('Pop-Up Testing', NULL, 'A few minutes', 'L3', 'PHASE 9 - Execution', 123),
    ('Calculated Value Segment (GGR etc.)', NULL, 'About 30 minutes', 'L3', 'PHASE 9 - Execution', 124),
    ('Segment Testing', NULL, 'About 30 minutes', 'L3', 'PHASE 9 - Execution', 125),
    ('Campaign Test', NULL, 'About 30 minutes', 'L3', 'PHASE 9 - Execution', 126),
    ('Scheduling Campaign', NULL, 'A few minutes', 'L3', 'PHASE 9 - Execution', 127),
    ('Brief Project', NULL, 'About 30 minutes', 'L2', 'PHASE 9 - Execution', 128),
    ('Terms and Conditions', NULL, 'About 1 hour', 'L3', 'PHASE 9 - Execution', 129),
    ('Update Promo Plan', NULL, 'About 30 minutes', 'L2', 'PHASE 9 - Execution', 130),
    ('Collecting Report Data (Weekly)', NULL, 'Half a day (4-8 hours)', 'L4', 'PHASE 9 - Execution', 131),
    ('Report Setup (Weekly)', NULL, '1 day', 'L4', 'PHASE 9 - Execution', 132),
    ('Present Weekly', NULL, 'About 1 hour', 'L3', 'PHASE 9 - Execution', 133),
    ('Promo Analysis Setup', NULL, 'About 1 hour', 'L4', 'PHASE 9 - Execution', 134),
    ('Present Promo Analysis', NULL, 'Half a day (4-8 hours)', 'L3', 'PHASE 9 - Execution', 135),
    ('Collecting Report Data (Monthly)', NULL, 'About 1 hour', 'L4', 'PHASE 9 - Execution', 136),
    ('Report Setup (Monthly)', NULL, 'About 1 hour', 'L4', 'PHASE 9 - Execution', 137),
    ('Present Monthly', NULL, 'About 1 hour', 'L3', 'PHASE 9 - Execution', 138),
    ('Setup Gamification Report', NULL, '1 day', 'L4', 'PHASE 9 - Execution', 139),
    ('Present Gamification Report', NULL, 'About 1 hour', 'L3', 'PHASE 9 - Execution', 140),
    -- PHASE 10 - Optimization
    ('Review monthly smartico releases', NULL, 'About 1 hour', 'L1', 'PHASE 10 - Optimization', 141),
    ('Analyse new release', NULL, '1 day', 'L4', 'PHASE 10 - Optimization', 142),
    ('Implement new smartico releases', NULL, 'A few days', 'L3', 'PHASE 10 - Optimization', 143),
    ('Communicate newly releases', NULL, 'About 1 hour', 'L4', 'PHASE 10 - Optimization', 144),
    ('Develop new lifecycles', NULL, '1 week', 'L3', 'PHASE 10 - Optimization', 145),
    ('Implement new lifecycles', NULL, '1 day', 'L3', 'PHASE 10 - Optimization', 146),
    ('Adjust mission plan', NULL, 'Half a day (4-8 hours)', 'L3', 'PHASE 10 - Optimization', 147),
    ('Implement new missions', NULL, 'Half a day (4-8 hours)', 'L2', 'PHASE 10 - Optimization', 148),
    ('Adjust Mini Games', NULL, 'A few days', 'L2', 'PHASE 10 - Optimization', 149),
    ('Implement new Mini Games', NULL, 'A few days', 'L2', 'PHASE 10 - Optimization', 150),
    ('Adjust segment criteria', NULL, 'A few days', 'L3', 'PHASE 10 - Optimization', 151),
    ('Implement new segments', NULL, 'A few days', 'L3', 'PHASE 10 - Optimization', 152),
    ('Develop new tournaments', NULL, 'A few days', 'L3', 'PHASE 10 - Optimization', 153),
    ('Implement new tournaments', NULL, 'A few days', 'L3', 'PHASE 10 - Optimization', 154),
    ('VIP', NULL, '1 day', 'L4', 'PHASE 10 - Optimization', 155),
    -- PHASE 11 - Internal
    ('Optimove Report', NULL, 'About 1 hour', 'L1', 'PHASE 11 - Internal', 156);
  END IF;
END $$;
