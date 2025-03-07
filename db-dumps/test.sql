PGDMP  )    8                 }            nest    14.15 (Homebrew)    16.0 H    �           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                      false            �           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                      false            �           0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                      false            �           1262    16385    nest    DATABASE     f   CREATE DATABASE nest WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'C';
    DROP DATABASE nest;
                postgres    false                        2615    2200    public    SCHEMA     2   -- *not* creating schema, since initdb creates it
 2   -- *not* dropping schema, since initdb creates it
                dnyongo    false            �           0    0    SCHEMA public    ACL     Q   REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;
                   dnyongo    false    4            �            1259    19170    County    TABLE     B  CREATE TABLE public."County" (
    id integer NOT NULL,
    name text NOT NULL,
    "isActive" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastUpdatedAt" timestamp(3) without time zone,
    "createdById" integer,
    "lastUpdatedById" integer
);
    DROP TABLE public."County";
       public         heap    postgres    false    4            �            1259    19169    County_id_seq    SEQUENCE     �   CREATE SEQUENCE public."County_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 &   DROP SEQUENCE public."County_id_seq";
       public          postgres    false    223    4            �           0    0    County_id_seq    SEQUENCE OWNED BY     C   ALTER SEQUENCE public."County_id_seq" OWNED BY public."County".id;
          public          postgres    false    222            �            1259    16468 
   Permission    TABLE     V   CREATE TABLE public."Permission" (
    id integer NOT NULL,
    name text NOT NULL
);
     DROP TABLE public."Permission";
       public         heap    postgres    false    4            �            1259    16467    Permission_id_seq    SEQUENCE     �   CREATE SEQUENCE public."Permission_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 *   DROP SEQUENCE public."Permission_id_seq";
       public          postgres    false    215    4            �           0    0    Permission_id_seq    SEQUENCE OWNED BY     K   ALTER SEQUENCE public."Permission_id_seq" OWNED BY public."Permission".id;
          public          postgres    false    214            �            1259    18745    Pest    TABLE     �  CREATE TABLE public."Pest" (
    id integer NOT NULL,
    name text NOT NULL,
    "scientificName" text NOT NULL,
    kingdom text NOT NULL,
    phylum text,
    genus text NOT NULL,
    family text NOT NULL,
    published boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastUpdatedAt" timestamp(3) without time zone,
    "createdById" integer,
    "lastUpdatedById" integer
);
    DROP TABLE public."Pest";
       public         heap    postgres    false    4            �            1259    18744    Pest_id_seq    SEQUENCE     �   CREATE SEQUENCE public."Pest_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 $   DROP SEQUENCE public."Pest_id_seq";
       public          postgres    false    221    4            �           0    0    Pest_id_seq    SEQUENCE OWNED BY     ?   ALTER SEQUENCE public."Pest_id_seq" OWNED BY public."Pest".id;
          public          postgres    false    220            �            1259    17399 	   Pesticide    TABLE     �  CREATE TABLE public."Pesticide" (
    id integer NOT NULL,
    "registrationNumber" text NOT NULL,
    "activeAgent" text NOT NULL,
    "manufacturerOfRegistrant" text NOT NULL,
    "localAgent" text NOT NULL,
    published boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastUpdatedAt" timestamp(3) without time zone,
    "createdById" integer,
    "lastUpdatedById" integer,
    name text NOT NULL
);
    DROP TABLE public."Pesticide";
       public         heap    postgres    false    4            �            1259    17398    Pesticide_id_seq    SEQUENCE     �   CREATE SEQUENCE public."Pesticide_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 )   DROP SEQUENCE public."Pesticide_id_seq";
       public          postgres    false    219    4            �           0    0    Pesticide_id_seq    SEQUENCE OWNED BY     I   ALTER SEQUENCE public."Pesticide_id_seq" OWNED BY public."Pesticide".id;
          public          postgres    false    218            �            1259    16459    Role    TABLE     P   CREATE TABLE public."Role" (
    id integer NOT NULL,
    name text NOT NULL
);
    DROP TABLE public."Role";
       public         heap    postgres    false    4            �            1259    16477    RolePermission    TABLE     �   CREATE TABLE public."RolePermission" (
    id integer NOT NULL,
    "roleId" integer NOT NULL,
    "permissionId" integer NOT NULL
);
 $   DROP TABLE public."RolePermission";
       public         heap    postgres    false    4            �            1259    16476    RolePermission_id_seq    SEQUENCE     �   CREATE SEQUENCE public."RolePermission_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 .   DROP SEQUENCE public."RolePermission_id_seq";
       public          postgres    false    4    217            �           0    0    RolePermission_id_seq    SEQUENCE OWNED BY     S   ALTER SEQUENCE public."RolePermission_id_seq" OWNED BY public."RolePermission".id;
          public          postgres    false    216            �            1259    16458    Role_id_seq    SEQUENCE     �   CREATE SEQUENCE public."Role_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 $   DROP SEQUENCE public."Role_id_seq";
       public          postgres    false    213    4            �           0    0    Role_id_seq    SEQUENCE OWNED BY     ?   ALTER SEQUENCE public."Role_id_seq" OWNED BY public."Role".id;
          public          postgres    false    212            �            1259    16400    User    TABLE     �   CREATE TABLE public."User" (
    id integer NOT NULL,
    password text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    "roleId" integer NOT NULL
);
    DROP TABLE public."User";
       public         heap    postgres    false    4            �            1259    16399    User_id_seq    SEQUENCE     �   CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 $   DROP SEQUENCE public."User_id_seq";
       public          postgres    false    211    4            �           0    0    User_id_seq    SEQUENCE OWNED BY     ?   ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;
          public          postgres    false    210            �            1259    16388    _prisma_migrations    TABLE     �  CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);
 &   DROP TABLE public._prisma_migrations;
       public         heap    postgres    false    4            �           2604    19173 	   County id    DEFAULT     j   ALTER TABLE ONLY public."County" ALTER COLUMN id SET DEFAULT nextval('public."County_id_seq"'::regclass);
 :   ALTER TABLE public."County" ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    222    223    223            �           2604    16471    Permission id    DEFAULT     r   ALTER TABLE ONLY public."Permission" ALTER COLUMN id SET DEFAULT nextval('public."Permission_id_seq"'::regclass);
 >   ALTER TABLE public."Permission" ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    215    214    215            �           2604    18748    Pest id    DEFAULT     f   ALTER TABLE ONLY public."Pest" ALTER COLUMN id SET DEFAULT nextval('public."Pest_id_seq"'::regclass);
 8   ALTER TABLE public."Pest" ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    220    221    221            �           2604    17402    Pesticide id    DEFAULT     p   ALTER TABLE ONLY public."Pesticide" ALTER COLUMN id SET DEFAULT nextval('public."Pesticide_id_seq"'::regclass);
 =   ALTER TABLE public."Pesticide" ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    218    219    219            �           2604    16462    Role id    DEFAULT     f   ALTER TABLE ONLY public."Role" ALTER COLUMN id SET DEFAULT nextval('public."Role_id_seq"'::regclass);
 8   ALTER TABLE public."Role" ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    213    212    213            �           2604    16480    RolePermission id    DEFAULT     z   ALTER TABLE ONLY public."RolePermission" ALTER COLUMN id SET DEFAULT nextval('public."RolePermission_id_seq"'::regclass);
 B   ALTER TABLE public."RolePermission" ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    216    217    217            �           2604    16403    User id    DEFAULT     f   ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);
 8   ALTER TABLE public."User" ALTER COLUMN id DROP DEFAULT;
       public          postgres    false    210    211    211            �          0    19170    County 
   TABLE DATA           x   COPY public."County" (id, name, "isActive", "createdAt", "lastUpdatedAt", "createdById", "lastUpdatedById") FROM stdin;
    public          postgres    false    223   �T       �          0    16468 
   Permission 
   TABLE DATA           0   COPY public."Permission" (id, name) FROM stdin;
    public          postgres    false    215   U       �          0    18745    Pest 
   TABLE DATA           �   COPY public."Pest" (id, name, "scientificName", kingdom, phylum, genus, family, published, "createdAt", "lastUpdatedAt", "createdById", "lastUpdatedById") FROM stdin;
    public          postgres    false    221   �U       �          0    17399 	   Pesticide 
   TABLE DATA           �   COPY public."Pesticide" (id, "registrationNumber", "activeAgent", "manufacturerOfRegistrant", "localAgent", published, "createdAt", "lastUpdatedAt", "createdById", "lastUpdatedById", name) FROM stdin;
    public          postgres    false    219   TV       �          0    16459    Role 
   TABLE DATA           *   COPY public."Role" (id, name) FROM stdin;
    public          postgres    false    213   W       �          0    16477    RolePermission 
   TABLE DATA           H   COPY public."RolePermission" (id, "roleId", "permissionId") FROM stdin;
    public          postgres    false    217   2W       �          0    16400    User 
   TABLE DATA           R   COPY public."User" (id, password, "createdAt", email, name, "roleId") FROM stdin;
    public          postgres    false    211   �W       �          0    16388    _prisma_migrations 
   TABLE DATA           �   COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
    public          postgres    false    209   Z       �           0    0    County_id_seq    SEQUENCE SET     =   SELECT pg_catalog.setval('public."County_id_seq"', 2, true);
          public          postgres    false    222            �           0    0    Permission_id_seq    SEQUENCE SET     B   SELECT pg_catalog.setval('public."Permission_id_seq"', 21, true);
          public          postgres    false    214            �           0    0    Pest_id_seq    SEQUENCE SET     ;   SELECT pg_catalog.setval('public."Pest_id_seq"', 7, true);
          public          postgres    false    220            �           0    0    Pesticide_id_seq    SEQUENCE SET     A   SELECT pg_catalog.setval('public."Pesticide_id_seq"', 87, true);
          public          postgres    false    218            �           0    0    RolePermission_id_seq    SEQUENCE SET     F   SELECT pg_catalog.setval('public."RolePermission_id_seq"', 18, true);
          public          postgres    false    216            �           0    0    Role_id_seq    SEQUENCE SET     ;   SELECT pg_catalog.setval('public."Role_id_seq"', 4, true);
          public          postgres    false    212            �           0    0    User_id_seq    SEQUENCE SET     <   SELECT pg_catalog.setval('public."User_id_seq"', 29, true);
          public          postgres    false    210                       2606    19179    County County_pkey 
   CONSTRAINT     T   ALTER TABLE ONLY public."County"
    ADD CONSTRAINT "County_pkey" PRIMARY KEY (id);
 @   ALTER TABLE ONLY public."County" DROP CONSTRAINT "County_pkey";
       public            postgres    false    223            �           2606    16475    Permission Permission_pkey 
   CONSTRAINT     \   ALTER TABLE ONLY public."Permission"
    ADD CONSTRAINT "Permission_pkey" PRIMARY KEY (id);
 H   ALTER TABLE ONLY public."Permission" DROP CONSTRAINT "Permission_pkey";
       public            postgres    false    215                       2606    18754    Pest Pest_pkey 
   CONSTRAINT     P   ALTER TABLE ONLY public."Pest"
    ADD CONSTRAINT "Pest_pkey" PRIMARY KEY (id);
 <   ALTER TABLE ONLY public."Pest" DROP CONSTRAINT "Pest_pkey";
       public            postgres    false    221            �           2606    17408    Pesticide Pesticide_pkey 
   CONSTRAINT     Z   ALTER TABLE ONLY public."Pesticide"
    ADD CONSTRAINT "Pesticide_pkey" PRIMARY KEY (id);
 F   ALTER TABLE ONLY public."Pesticide" DROP CONSTRAINT "Pesticide_pkey";
       public            postgres    false    219            �           2606    16482 "   RolePermission RolePermission_pkey 
   CONSTRAINT     d   ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_pkey" PRIMARY KEY (id);
 P   ALTER TABLE ONLY public."RolePermission" DROP CONSTRAINT "RolePermission_pkey";
       public            postgres    false    217            �           2606    16466    Role Role_pkey 
   CONSTRAINT     P   ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);
 <   ALTER TABLE ONLY public."Role" DROP CONSTRAINT "Role_pkey";
       public            postgres    false    213            �           2606    16408    User User_pkey 
   CONSTRAINT     P   ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);
 <   ALTER TABLE ONLY public."User" DROP CONSTRAINT "User_pkey";
       public            postgres    false    211            �           2606    16396 *   _prisma_migrations _prisma_migrations_pkey 
   CONSTRAINT     h   ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);
 T   ALTER TABLE ONLY public._prisma_migrations DROP CONSTRAINT _prisma_migrations_pkey;
       public            postgres    false    209                       1259    19180    County_name_key    INDEX     M   CREATE UNIQUE INDEX "County_name_key" ON public."County" USING btree (name);
 %   DROP INDEX public."County_name_key";
       public            postgres    false    223            �           1259    16484    Permission_name_key    INDEX     U   CREATE UNIQUE INDEX "Permission_name_key" ON public."Permission" USING btree (name);
 )   DROP INDEX public."Permission_name_key";
       public            postgres    false    215                        1259    18755    Pest_name_key    INDEX     I   CREATE UNIQUE INDEX "Pest_name_key" ON public."Pest" USING btree (name);
 #   DROP INDEX public."Pest_name_key";
       public            postgres    false    221                       1259    18756    Pest_scientificName_key    INDEX     _   CREATE UNIQUE INDEX "Pest_scientificName_key" ON public."Pest" USING btree ("scientificName");
 -   DROP INDEX public."Pest_scientificName_key";
       public            postgres    false    221            �           1259    18053    Pesticide_name_key    INDEX     S   CREATE UNIQUE INDEX "Pesticide_name_key" ON public."Pesticide" USING btree (name);
 (   DROP INDEX public."Pesticide_name_key";
       public            postgres    false    219            �           1259    17410     Pesticide_registrationNumber_key    INDEX     q   CREATE UNIQUE INDEX "Pesticide_registrationNumber_key" ON public."Pesticide" USING btree ("registrationNumber");
 6   DROP INDEX public."Pesticide_registrationNumber_key";
       public            postgres    false    219            �           1259    16485 &   RolePermission_roleId_permissionId_key    INDEX     �   CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON public."RolePermission" USING btree ("roleId", "permissionId");
 <   DROP INDEX public."RolePermission_roleId_permissionId_key";
       public            postgres    false    217    217            �           1259    16483    Role_name_key    INDEX     I   CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);
 #   DROP INDEX public."Role_name_key";
       public            postgres    false    213            �           1259    16486    User_email_key    INDEX     K   CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);
 $   DROP INDEX public."User_email_key";
       public            postgres    false    211            
           2606    18374 $   Pesticide Pesticide_createdById_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Pesticide"
    ADD CONSTRAINT "Pesticide_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 R   ALTER TABLE ONLY public."Pesticide" DROP CONSTRAINT "Pesticide_createdById_fkey";
       public          postgres    false    3570    219    211                       2606    18379 (   Pesticide Pesticide_lastUpdatedById_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Pesticide"
    ADD CONSTRAINT "Pesticide_lastUpdatedById_fkey" FOREIGN KEY ("lastUpdatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;
 V   ALTER TABLE ONLY public."Pesticide" DROP CONSTRAINT "Pesticide_lastUpdatedById_fkey";
       public          postgres    false    219    211    3570                       2606    16497 /   RolePermission RolePermission_permissionId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 ]   ALTER TABLE ONLY public."RolePermission" DROP CONSTRAINT "RolePermission_permissionId_fkey";
       public          postgres    false    215    3576    217            	           2606    16492 )   RolePermission RolePermission_roleId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."RolePermission"
    ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 W   ALTER TABLE ONLY public."RolePermission" DROP CONSTRAINT "RolePermission_roleId_fkey";
       public          postgres    false    213    217    3573                       2606    16487    User User_roleId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
 C   ALTER TABLE ONLY public."User" DROP CONSTRAINT "User_roleId_fkey";
       public          postgres    false    3573    213    211            �   7   x�3��K�,�O�Tp�,�4202�50�54U04�24�2�г4��� �=... D�6      �   �   x�]��
�0E׽S����KA$�E@T�h��WӦ�=�9�Nz�����=;��v<NIV��jkm��C�.Ѹ���AM]Q��1��}�O��<�卫��K��t+Ʉ�n��t6[�Ͱ�M�L�Kq���K�"K�q�;�/      �   �   x�3���O.-.Qp�N��,.�ON-JNTH/JMO,�L�t���M�3J2���SPr:&e�d�$�r�p����*ZXX�Z�Yr��A�1�6�v)Q`���������1�6s�ߌq�gL�}�V&z&�b���� ��e�      �   �   x��н�0�}��@��_�f��N�,D���c�2��j4���Hr�3�/�Z@�������M7���z�����;��>&r.��.oi
>|���	%$�4�*4�	�f Qq�޺���6�
gjA���5�sǭ��I�.��*���I͔�.}ɰ�w�5���-G\0���0      �      x�3�tt�������� �V      �   P   x�̱�0���(�G8ٖԋ���	�p��K�[����.����V>����)ىfo��Q|1�#�1����p%��|$w      �   a  x�u�Is�@�~
�f`V��S�[D��[��	
aQ��?M���"Us����uw�I���}�B"��"|��*�*� ������nޓ��V����~��6knf*T ��*��Yn=!�	�ON�[�F��d!�f�F3���e|�8�:�?��btЬ����~�Jwe3 ��&�ń��L?u#�3a��~�����3_N5��Nʡ@������.�Q�;PR!V)��[UU�7����~����y*ڇ�9熵��I@|I*w37�	�{���Y����B��>��� B*F ^/$��Kx�����K�o�r'���7���M�BV���Lc�-/=�~�P��[�_�/]���������N�&���ʰp�7�Ť� W.���e���3��f��7Ѱ�iL/��,E�Rţ)�� ��&j4���nzE�r��0/���>^�:�c�C✎p��V�U�^L�T���ew7޶9��>,K�զ�uto��m�:����.-�z��X�����d6��ۮ��P3%�v�Yu	
�	�glr��r��u"p�ܨ�D$�9���t�e�&�Tɤ%�^�2_�pƷ�wpY��b=�u�O��RQ%@��&�/h��� �;�      �   $  x���]n[9���U�} ����EtJ�02MP�����L�� �^���xx�#Vw��S��\�4/#�:ӌ��Ш����P�F�̠s`��]kwܮ�4B<:.�V769�����v�z4���o�B'T�z~��x=|�x;���`v����̻���\�o��s���s�u �>�m�e��MU6��՗�1�Z�8zҥ0�ô{�xB8���~��0�t�_¯q�����K|���ry|�|�яZQ^�PBA��}��Jc�2q����yhɰVu�n+���K,���L=-\D#�"��@Yk��)�T��ɉ�ZU�7"d�$�Ͼ�y���O����K���痯����g����W�j]_�"zW\EGkE���e�G�H�+�jS�sS�|�����⥉��|DS[��Q�`��I��I��Ҳ?�\�B���ߊ��;V���eш"kH9�E�[�'�mV�!+Xk۾*����j���w[tsi��U"L��.>��Ў����"���}�����;����J���"ٯ2�[a�]iW����$ؙ��.M&� ��)}��F�D���oòYU2�9�}���r%�t��cv
��a!� �&���V��c5іS�z�^�x��qK�-`���d�1&�%���Τ��>f�bVۄێI�Ҥ�Ct[+:&�������[iwn�����K\�竏���}����՞̶e8V��vڽ�Xrp���{9W��d�=�6�ޖU���9-;g�fF<�H�yι��;rR�s�x��'���|�������(��׭�������9�     