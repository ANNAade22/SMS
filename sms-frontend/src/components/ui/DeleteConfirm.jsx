import Modal from "./Modal";

/**
 * Generic delete confirmation modal.
 * Props:
 *  - isOpen
 *  - onClose
 *  - onConfirm (async or sync)
 *  - title (default: 'Confirm Deletion')
 *  - message (string or React node)
 *  - confirmLabel (default: 'Delete')
 *  - loading (boolean)
 */
const DeleteConfirm = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Deletion",
  message = "Are you sure you want to delete this item? This action cannot be undone.",
  confirmLabel = "Delete",
  loading = false,
}) => {
  if (!isOpen) return null;
  return (
    <Modal
      title={title}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? "Deleting..." : confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-gray-700 text-sm leading-relaxed">{message}</div>
    </Modal>
  );
};

export default DeleteConfirm;
