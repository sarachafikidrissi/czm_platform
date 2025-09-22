const Navbar = () => {
    return (
        <div className="navbar grid  w-[100vw] grid-cols-3 bg-[#fbf6f6] px-4 shadow-sm">
            <div className="flex h-10 items-center ">
                    <img src="/images/CENTRE-ZAWAJ-PNG-LOGO.png" alt="centre zawaj maroc" className="w-[100px]" />

            </div>
            <div className="h-10 flex items-center ">
                {/* <a className="btn btn-ghost text-xl"> */}
                    <img src="/images/first-center.png" alt="centre zawaj maroc" className="w-full" />
                {/* </a> */}
            </div>
            <div className="flex h-10  place-content-end pe-3">
                {/* <input type="text" placeholder="Search" className="input input-bordered w-24 md:w-auto" /> */}
                <div className="dropdown dropdown-end">
                    <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                        <div className="w-10 rounded-full">
                            {/* must be user profile picture  */}
                            <img
                                alt="Tailwind CSS Navbar component"
                                src="https://img.daisyui.com/images/stock/photo-1534528741775-53994a69daeb.webp"
                            />
                        </div>
                    </div>
                    <ul tabIndex={0} className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow">
                        <li>
                            <a className="justify-between">
                                Profile
                                <span className="badge">New</span>
                            </a>
                        </li>
                        <li>
                            <a>Settings</a>
                        </li>
                        <li>
                            <a>Logout</a>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Navbar;
