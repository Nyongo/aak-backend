PGDMP      *                 }            nest    14.15 (Homebrew)    16.0     �           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                      false            �           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                      false            �           0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                      false            �           1262    16385    nest    DATABASE     f   CREATE DATABASE nest WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'C';
    DROP DATABASE nest;
                postgres    false            �          0    19170    County 
   TABLE DATA           x   COPY public."County" (id, name, "isActive", "createdAt", "lastUpdatedAt", "createdById", "lastUpdatedById") FROM stdin;
    public          postgres    false    223   �       �          0    16468 
   Permission 
   TABLE DATA           0   COPY public."Permission" (id, name) FROM stdin;
    public          postgres    false    215   �       �          0    18745    Pest 
   TABLE DATA           �   COPY public."Pest" (id, name, "scientificName", kingdom, phylum, genus, family, published, "createdAt", "lastUpdatedAt", "createdById", "lastUpdatedById") FROM stdin;
    public          postgres    false    221   �       �          0    16459    Role 
   TABLE DATA           *   COPY public."Role" (id, name) FROM stdin;
    public          postgres    false    213   '       �          0    16400    User 
   TABLE DATA           R   COPY public."User" (id, password, "createdAt", email, name, "roleId") FROM stdin;
    public          postgres    false    211   L       �          0    17399 	   Pesticide 
   TABLE DATA           �   COPY public."Pesticide" (id, "registrationNumber", "activeAgent", "manufacturerOfRegistrant", "localAgent", published, "createdAt", "lastUpdatedAt", "createdById", "lastUpdatedById", name) FROM stdin;
    public          postgres    false    219   �       �          0    16477    RolePermission 
   TABLE DATA           H   COPY public."RolePermission" (id, "roleId", "permissionId") FROM stdin;
    public          postgres    false    217   v       �          0    16388    _prisma_migrations 
   TABLE DATA           �   COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
    public          postgres    false    209   �       �           0    0    County_id_seq    SEQUENCE SET     =   SELECT pg_catalog.setval('public."County_id_seq"', 2, true);
          public          postgres    false    222            �           0    0    Permission_id_seq    SEQUENCE SET     B   SELECT pg_catalog.setval('public."Permission_id_seq"', 21, true);
          public          postgres    false    214            �           0    0    Pest_id_seq    SEQUENCE SET     ;   SELECT pg_catalog.setval('public."Pest_id_seq"', 7, true);
          public          postgres    false    220            �           0    0    Pesticide_id_seq    SEQUENCE SET     A   SELECT pg_catalog.setval('public."Pesticide_id_seq"', 87, true);
          public          postgres    false    218            �           0    0    RolePermission_id_seq    SEQUENCE SET     F   SELECT pg_catalog.setval('public."RolePermission_id_seq"', 18, true);
          public          postgres    false    216            �           0    0    Role_id_seq    SEQUENCE SET     ;   SELECT pg_catalog.setval('public."Role_id_seq"', 4, true);
          public          postgres    false    212            �           0    0    User_id_seq    SEQUENCE SET     <   SELECT pg_catalog.setval('public."User_id_seq"', 29, true);
          public          postgres    false    210            �   7   x�3��K�,�O�Tp�,�4202�50�54U04�24�2�г4��� �=... D�6      �   �   x�]��
�0E׽S����KA$�E@T�h��WӦ�=�9�Nz�����=;��v<NIV��jkm��C�.Ѹ���AM]Q��1��}�O��<�卫��K��t+Ʉ�n��t6[�Ͱ�M�L�Kq���K�"K�q�;�/      �   �   x�3���O.-.Qp�N��,.�ON-JNTH/JMO,�L�t���M�3J2���SPr:&e�d�$�r�p����*ZXX�Z�Yr��A�1�6�v)Q`���������1�6s�ߌq�gL�}�V&z&�b���� ��e�      �      x�3�tt�������� �V      �   a  x�u�Is�@�~
�f`V��S�[D��[��	
aQ��?M���"Us����uw�I���}�B"��"|��*�*� ������nޓ��V����~��6knf*T ��*��Yn=!�	�ON�[�F��d!�f�F3���e|�8�:�?��btЬ����~�Jwe3 ��&�ń��L?u#�3a��~�����3_N5��Nʡ@������.�Q�;PR!V)��[UU�7����~����y*ڇ�9熵��I@|I*w37�	�{���Y����B��>��� B*F ^/$��Kx�����K�o�r'���7���M�BV���Lc�-/=�~�P��[�_�/]���������N�&���ʰp�7�Ť� W.���e���3��f��7Ѱ�iL/��,E�Rţ)�� ��&j4���nzE�r��0/���>^�:�c�C✎p��V�U�^L�T���ew7޶9��>,K�զ�uto��m�:����.-�z��X�����d6��ۮ��P3%�v�Yu	
�	�glr��r��u"p�ܨ�D$�9���t�e�&�Tɤ%�^�2_�pƷ�wpY��b=�u�O��RQ%@��&�/h��� �;�      �   �   x��н�0�}��@��_�f��N�,D���c�2��j4���Hr�3�/�Z@�������M7���z�����;��>&r.��.oi
>|���	%$�4�*4�	�f Qq�޺���6�
gjA���5�sǭ��I�.��*���I͔�.}ɰ�w�5���-G\0���0      �   P   x�̱�0���(�G8ٖԋ���	�p��K�[����.����V>����)ىfo��Q|1�#�1����p%��|$w      �   $  x���]n[9���U�} ����EtJ�02MP�����L�� �^���xx�#Vw��S��\�4/#�:ӌ��Ш����P�F�̠s`��]kwܮ�4B<:.�V769�����v�z4���o�B'T�z~��x=|�x;���`v����̻���\�o��s���s�u �>�m�e��MU6��՗�1�Z�8zҥ0�ô{�xB8���~��0�t�_¯q�����K|���ry|�|�яZQ^�PBA��}��Jc�2q����yhɰVu�n+���K,���L=-\D#�"��@Yk��)�T��ɉ�ZU�7"d�$�Ͼ�y���O����K���痯����g����W�j]_�"zW\EGkE���e�G�H�+�jS�sS�|�����⥉��|DS[��Q�`��I��I��Ҳ?�\�B���ߊ��;V���eш"kH9�E�[�'�mV�!+Xk۾*����j���w[tsi��U"L��.>��Ў����"���}�����;����J���"ٯ2�[a�]iW����$ؙ��.M&� ��)}��F�D���oòYU2�9�}���r%�t��cv
��a!� �&���V��c5іS�z�^�x��qK�-`���d�1&�%���Τ��>f�bVۄێI�Ҥ�Ct[+:&�������[iwn�����K\�竏���}����՞̶e8V��vڽ�Xrp���{9W��d�=�6�ޖU���9-;g�fF<�H�yι��;rR�s�x��'���|�������(��׭�������9�     